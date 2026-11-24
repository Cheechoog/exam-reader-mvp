import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

type Option = 'A' | 'B' | 'C' | 'D';

type CreateAnswerKeyBody = {
  title: string;
  totalQuestions: number;
  answers: Record<string, Option>;
};

function isValidOption(value: unknown): value is Option {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D';
}

export async function GET() {
  const keys = await prisma.answerKey.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateAnswerKeyBody;

    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { error: 'title es obligatorio' },
        { status: 400 }
      );
    }

    if (
      !body.totalQuestions ||
      typeof body.totalQuestions !== 'number' ||
      body.totalQuestions <= 0
    ) {
      return NextResponse.json(
        { error: 'totalQuestions debe ser un número mayor a 0' },
        { status: 400 }
      );
    }

    if (!body.answers || typeof body.answers !== 'object') {
      return NextResponse.json(
        { error: 'answers es obligatorio' },
        { status: 400 }
      );
    }

    for (let i = 1; i <= body.totalQuestions; i++) {
      const answer = body.answers[String(i)];

      if (!isValidOption(answer)) {
        return NextResponse.json(
          { error: `Respuesta inválida en la pregunta ${i}` },
          { status: 400 }
        );
      }
    }

    const created = await prisma.answerKey.create({
      data: {
        title: body.title,
        totalQuestions: body.totalQuestions,
        answersJson: body.answers,
      },
    });

    return NextResponse.json({
      id: created.id,
      title: created.title,
      totalQuestions: created.totalQuestions,
      answers: created.answersJson,
      createdAt: created.createdAt,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}