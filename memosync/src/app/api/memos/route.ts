import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 一覧取得 (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const memos = await prisma.memo.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' }, // 新しい順
    });
    return NextResponse.json(memos);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching memos' }, { status: 500 });
  }
}

// 新規作成 (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, userId } = body;

    const newMemo = await prisma.memo.create({
      data: {
        title,
        content,
        userId,
      },
    });
    return NextResponse.json(newMemo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating memo' }, { status: 500 });
  }
}