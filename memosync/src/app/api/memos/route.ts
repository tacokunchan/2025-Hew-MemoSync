import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
  const { title, content, userId, createdAt, isSchedule, color, category, handwriting } = body; // ★createdAt, isSchedule, color, category, handwritingを受け取る

  const memo = await prisma.memo.create({
    data: {
      title,
      content,
      userId,
      isSchedule: isSchedule ?? false, // isScheduleがあれば使い、なければfalse
      color,
      category,
      handwriting,
      // ★ここが重要！送られてきたcreatedAtがあれば使い、なければ現在時刻(now)にする
      createdAt: createdAt ? new Date(createdAt) : new Date(),
    },
  });

  return NextResponse.json(memo);
}