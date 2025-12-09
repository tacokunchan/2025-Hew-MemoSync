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
// app/api/memos/route.ts のPOSTメソッドの例

export async function POST(req: Request) {
  const body = await req.json();
  const { title, content, userId, createdAt } = body; // ★createdAtを受け取る

  const memo = await prisma.memo.create({
    data: {
      title,
      content,
      userId,
      // ★ここが重要！送られてきたcreatedAtがあれば使い、なければ現在時刻(now)にする
      createdAt: createdAt ? new Date(createdAt) : new Date(), 
    },
  });
  
  return NextResponse.json(memo);
}