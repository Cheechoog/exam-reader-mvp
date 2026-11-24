import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      answerKey: true,
    },
  });

  if (!submission) {
    return NextResponse.json(
      { error: 'Submission no encontrado' },
      { status: 404 }
    );
  }

  return NextResponse.json(submission);
}