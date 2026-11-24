import cv2
import json
import sys
import numpy as np
import os

OPTIONS = ["A", "B", "C", "D"]

CANONICAL_WIDTH = 465
CANONICAL_HEIGHT = 633

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "template_base.png")

EXPECTED_MARKER_POINTS = np.array([
    [30, 55],    # top-left
    [422, 55],   # top-right
    [30, 600],   # bottom-left
    [422, 600],  # bottom-right
], dtype=np.float32)

INNER_RADIUS = 6
MIN_THRESHOLD = 0.05
MULTIPLE_RELATIVE_THRESHOLD = 0.82


def detect_marker_centers(gray):
    _, th = cv2.threshold(gray, 70, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 80 or area > 5000:
            continue

        x, y, w, h = cv2.boundingRect(cnt)
        aspect = w / float(h) if h > 0 else 0

        if 0.6 <= aspect <= 1.4:
            cx = x + w / 2
            cy = y + h / 2
            candidates.append((cx, cy, area, x, y, w, h))

    if len(candidates) < 4:
        raise Exception("No se encontraron suficientes marcadores negros")

    h, w = gray.shape[:2]
    corners = {
        "tl": (0, 0),
        "tr": (w, 0),
        "bl": (0, h),
        "br": (w, h),
    }

    def dist(p, q):
        return ((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2) ** 0.5

    points = {}
    for key, corner in corners.items():
        best = min(candidates, key=lambda c: dist((c[0], c[1]), corner))
        points[key] = [best[0], best[1]]

    return np.array([
        points["tl"],
        points["tr"],
        points["bl"],
        points["br"],
    ], dtype=np.float32)


def warp_sheet(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    markers = detect_marker_centers(gray)

    transform = cv2.getPerspectiveTransform(markers, EXPECTED_MARKER_POINTS)
    warped = cv2.warpPerspective(
        image,
        transform,
        (CANONICAL_WIDTH, CANONICAL_HEIGHT)
    )

    return warped


def detect_bubbles_from_template():
    template = cv2.imread(TEMPLATE_PATH)
    if template is None:
        raise Exception("No se pudo abrir omr/template_base.png")

    warped = warp_sheet(template)
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)

    circles = cv2.HoughCircles(
        gray,
        cv2.HOUGH_GRADIENT,
        dp=1.15,
        minDist=20,
        param1=100,
        param2=14,
        minRadius=8,
        maxRadius=14
    )

    if circles is None:
        raise Exception("No se detectaron burbujas en la plantilla base")

    circles = np.round(circles[0]).astype(int)

    filtered = []
    for x, y, r in circles:
        if 85 <= x <= 365 and 110 <= y <= 560:
            filtered.append((x, y, r))

    if len(filtered) < 80:
        raise Exception(f"Se detectaron muy pocas burbujas: {len(filtered)}")

    xs = sorted([c[0] for c in filtered])
    ys = sorted([c[1] for c in filtered])

    def cluster(vals, tol=10):
        groups = []
        for v in vals:
            if not groups or abs(v - groups[-1][-1]) > tol:
                groups.append([v])
            else:
                groups[-1].append(v)
        return [int(round(sum(g) / len(g))) for g in groups]

    x_groups = cluster(xs, tol=10)
    x_groups = [x for x in x_groups if 90 <= x <= 360]

    if len(x_groups) < 8:
        raise Exception(f"No se pudieron inferir bien las columnas: {x_groups}")

    x_groups = sorted(x_groups)[:8]
    left_x = x_groups[:4]
    right_x = x_groups[4:8]

    y_groups = cluster(ys, tol=10)
    y_groups = [y for y in y_groups if 110 <= y <= 560]

    if len(y_groups) < 12:
        raise Exception(f"No se pudieron inferir bien las filas: {y_groups}")

    left_y = y_groups[:12]
    right_y = y_groups[:8]

    mapping = {}

    for idx, y in enumerate(left_y, start=1):
        mapping[idx] = {
            "A": (left_x[0], y),
            "B": (left_x[1], y),
            "C": (left_x[2], y),
            "D": (left_x[3], y),
        }

    for offset, y in enumerate(right_y, start=13):
        mapping[offset] = {
            "A": (right_x[0], y),
            "B": (right_x[1], y),
            "C": (right_x[2], y),
            "D": (right_x[3], y),
        }

    return mapping, warped


def preprocess_gray(gray):
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    return gray


def build_darkening_image(student_gray, template_gray):
    """
    Solo deja cambios donde el estudiante oscureció respecto a la hoja base.
    Eso evita que el borde impreso del círculo cuente como marca.
    """
    student_p = preprocess_gray(student_gray)
    template_p = preprocess_gray(template_gray)

    darkening = cv2.subtract(template_p, student_p)

    _, th = cv2.threshold(darkening, 18, 255, cv2.THRESH_BINARY)

    kernel = np.ones((3, 3), np.uint8)
    th = cv2.morphologyEx(th, cv2.MORPH_OPEN, kernel)
    th = cv2.morphologyEx(th, cv2.MORPH_CLOSE, kernel)

    return th


def bubble_score(diff_img, cx, cy, radius):
    mask = np.zeros(diff_img.shape, dtype=np.uint8)
    cv2.circle(mask, (int(cx), int(cy)), int(radius), 255, -1)

    masked = cv2.bitwise_and(diff_img, diff_img, mask=mask)
    filled = cv2.countNonZero(masked)
    total = cv2.countNonZero(mask)

    return filled / total if total > 0 else 0.0


def robust_threshold(all_scores):
    scores = np.array(all_scores, dtype=np.float32)

    median = float(np.median(scores))
    mad = float(np.median(np.abs(scores - median)))

    threshold = median + max(0.03, 4.0 * mad)
    threshold = max(threshold, MIN_THRESHOLD)

    return threshold


def detect_answers(image_path):
    image = cv2.imread(image_path)
    if image is None:
        raise Exception("No se pudo abrir la imagen enviada")

    student_warped = warp_sheet(image)
    bubble_map, template_warped = detect_bubbles_from_template()

    student_gray = cv2.cvtColor(student_warped, cv2.COLOR_BGR2GRAY)
    template_gray = cv2.cvtColor(template_warped, cv2.COLOR_BGR2GRAY)

    diff_img = build_darkening_image(student_gray, template_gray)

    # primero sacar todos los scores para calcular umbral dinámico
    per_question_metrics = {}
    all_scores = []

    for q in range(1, 21):
        metrics = []
        for option in OPTIONS:
            cx, cy = bubble_map[q][option]
            score = bubble_score(diff_img, cx, cy, INNER_RADIUS)
            metrics.append({
                "option": option,
                "fillRatio": round(score, 4)
            })
            all_scores.append(score)
        per_question_metrics[q] = metrics

    threshold = robust_threshold(all_scores)

    results = []

    for q in range(1, 21):
        metrics = per_question_metrics[q]
        metrics_sorted = sorted(metrics, key=lambda m: m["fillRatio"], reverse=True)
        best = metrics_sorted[0]
        second = metrics_sorted[1]

        detected_option = None
        status = "blank"

        if best["fillRatio"] < threshold:
            status = "blank"
        elif second["fillRatio"] >= threshold and second["fillRatio"] >= best["fillRatio"] * MULTIPLE_RELATIVE_THRESHOLD:
            status = "multiple"
        else:
            status = "detected"
            detected_option = best["option"]

        results.append({
            "questionNumber": q,
            "detectedOption": detected_option,
            "status": status,
            "confidence": round(best["fillRatio"], 4),
            "metrics": metrics
        })

    return results


def calculate_score(detected_answers, answer_key):
    total_correct = 0
    total_incorrect = 0
    total_blank = 0
    total_multiple = 0

    for item in detected_answers:
        qn = str(item["questionNumber"])
        expected = answer_key.get(qn)
        detected = item["detectedOption"]

        if item["status"] == "blank":
            total_blank += 1
            continue

        if item["status"] == "multiple":
            total_multiple += 1
            continue

        if detected == expected:
            total_correct += 1
        else:
            total_incorrect += 1

    total_questions = len(answer_key)
    score = round((total_correct / total_questions) * 5, 2) if total_questions > 0 else 0.0

    return {
        "totalCorrect": total_correct,
        "totalIncorrect": total_incorrect,
        "totalBlank": total_blank,
        "totalMultiple": total_multiple,
        "score": score
    }


def main():
    payload = json.loads(sys.argv[1])
    image_path = payload["imagePath"]
    answer_key = payload["answerKey"]

    detected_answers = detect_answers(image_path)
    totals = calculate_score(detected_answers, answer_key)

    print(json.dumps({
        "detectedAnswers": detected_answers,
        **totals
    }))


if __name__ == "__main__":
    main()