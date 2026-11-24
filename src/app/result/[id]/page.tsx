'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type DetectedAnswer = {
  questionNumber: number;
  detectedOption: string | null;
  status: string;
  confidence: number;
};

type Submission = {
  id: string;
  studentName: string | null;
  originalFilename: string;
  imagePath: string;
  status: string;
  createdAt: string;
  score: number | null;
  totalCorrect: number | null;
  totalIncorrect: number | null;
  totalBlank: number | null;
  totalMultiple: number | null;
  detectedAnswers: DetectedAnswer[] | null;
  answerKey: {
    id: string;
    title: string;
    totalQuestions: number;
    answersJson: Record<string, string>;
  };
};

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissionId, setSubmissionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function init() {
      const resolved = await params;
      setSubmissionId(resolved.id);
    }

    init();
  }, [params]);

  useEffect(() => {
    async function loadSubmission() {
      if (!submissionId) return;

      try {
        setLoading(true);
        setError('');

        const res = await fetch(`/api/submissions/${submissionId}`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'No se pudo cargar el resultado');
          return;
        }

        setSubmission(data);
      } catch (err) {
        console.error(err);
        setError('Ocurrió un error cargando el resultado');
      } finally {
        setLoading(false);
      }
    }

    loadSubmission();
  }, [submissionId]);

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-bold">Resultado del examen</h1>
        <p className="mb-8 text-sm text-gray-600">
          Aquí verás la nota, el nombre del estudiante y las respuestas detectadas.
        </p>

        {loading && <p className="text-sm text-gray-600">Cargando resultado...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {submission && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 p-6">
              <h2 className="mb-4 text-xl font-semibold">Resumen</h2>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Estudiante</div>
                  <div className="text-lg font-medium">
                    {submission.studentName || 'Sin nombre'}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Clave usada</div>
                  <div className="text-lg font-medium">
                    {submission.answerKey.title}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Estado</div>
                  <div className="text-lg font-medium">{submission.status}</div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Nota final</div>
                  <div className="text-2xl font-bold">
                    {submission.score?.toFixed(2) ?? '0.00'}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Correctas</div>
                  <div className="text-lg font-medium">
                    {submission.totalCorrect ?? 0}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Incorrectas</div>
                  <div className="text-lg font-medium">
                    {submission.totalIncorrect ?? 0}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">En blanco / múltiples</div>
                  <div className="text-lg font-medium">
                    {(submission.totalBlank ?? 0) + (submission.totalMultiple ?? 0)}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Archivo original</div>
                  <div className="text-lg font-medium">
                    {submission.originalFilename}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Fecha</div>
                  <div className="text-lg font-medium">
                    {new Date(submission.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-6">
              <h2 className="mb-4 text-xl font-semibold">Respuestas detectadas</h2>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {submission.detectedAnswers?.map((item) => {
                  const expected =
                    submission.answerKey.answersJson[String(item.questionNumber)];
                  const isCorrect = item.detectedOption === expected;

                  return (
                    <div
                      key={item.questionNumber}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="font-semibold">Pregunta {item.questionNumber}</div>
                      <div className="text-sm text-gray-600">
                        Detectada: {item.detectedOption ?? '-'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Correcta: {expected}
                      </div>
                      <div
                        className={`mt-2 text-sm font-medium ${
                          item.status !== 'detected'
                            ? 'text-orange-600'
                            : isCorrect
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {item.status !== 'detected'
                          ? item.status
                          : isCorrect
                          ? 'Correcta'
                          : 'Incorrecta'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-6">
              <h2 className="mb-4 text-xl font-semibold">Imagen cargada</h2>
              <img
                src={submission.imagePath}
                alt="Hoja cargada"
                className="max-h-[700px] rounded-xl border border-gray-200"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/answer-keys"
                className="rounded-lg border border-black px-4 py-3"
              >
                Volver a claves
              </Link>

              <Link
                href={`/grade?answerKeyId=${submission.answerKey.id}`}
                className="rounded-lg bg-black px-4 py-3 text-white"
              >
                Calificar otra hoja con esta clave
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}