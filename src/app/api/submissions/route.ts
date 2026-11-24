import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const answerKeyId = formData.get('answerKeyId');
    const studentNameValue = formData.get('studentName');
    const file = formData.get('file');

    const studentName =
      typeof studentNameValue === 'string' && studentNameValue.trim()
        ? studentNameValue.trim()
        : null;

    if (!answerKeyId || typeof answerKeyId !== 'string') {
      return NextResponse.json(
        { error: 'answerKeyId es obligatorio' },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'La imagen es obligatoria' },
        { status: 400 }
      );
    }

    const answerKey = await prisma.answerKey.findUnique({
      where: { id: answerKeyId },
    });

    if (!answerKey) {
      return NextResponse.json(
        { error: 'La clave seleccionada no existe' },
        { status: 404 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeFilename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const absoluteFilePath = path.join(uploadsDir, safeFilename);
    const relativeFilePath = `/uploads/${safeFilename}`;

    fs.writeFileSync(absoluteFilePath, buffer);

    const scriptPath = path.join(process.cwd(), 'omr', 'main.py');

    const payload = {
      imagePath: absoluteFilePath,
      answerKey: answerKey.answersJson,
    };

    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

    const omrResult = await new Promise<any>((resolve, reject) => {
      const py = spawn(pythonCommand, [scriptPath, JSON.stringify(payload)]);

      let stdout = '';
      let stderr = '';

      py.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      py.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      py.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr || 'Fallo ejecutando Python'));
          return;
        }

        try {
          resolve(JSON.parse(stdout));
        } catch (err) {
          reject(err);
        }
      });
    });

    const submission = await prisma.submission.create({
      data: {
        answerKeyId,
        studentName,
        originalFilename: file.name,
        imagePath: relativeFilePath,
        status: 'graded',
        score: omrResult.score,
        totalCorrect: omrResult.totalCorrect,
        totalIncorrect: omrResult.totalIncorrect,
        totalBlank: omrResult.totalBlank,
        totalMultiple: omrResult.totalMultiple,
        requiresReview: omrResult.totalMultiple > 0,
        detectedAnswers: omrResult.detectedAnswers,
      },
    });

    return NextResponse.json({
      id: submission.id,
      answerKeyId: submission.answerKeyId,
      studentName: submission.studentName,
      imagePath: submission.imagePath,
      status: submission.status,
      score: submission.score,
      totalCorrect: submission.totalCorrect,
      totalIncorrect: submission.totalIncorrect,
      totalBlank: submission.totalBlank,
      totalMultiple: submission.totalMultiple,
      createdAt: submission.createdAt,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Error interno procesando la hoja',
      },
      { status: 500 }
    );
  }
}