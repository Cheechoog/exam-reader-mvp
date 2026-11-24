import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET() {
  const answerKeysCount = await prisma.answerKey.count();

  return NextResponse.json({
    ok: true,
    database: 'connected',
    answerKeysCount,
  });
}