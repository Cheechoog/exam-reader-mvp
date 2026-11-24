import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET() {
  const results = await prisma.submission.findMany({
    include: {
      answerKey: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json(results);
}