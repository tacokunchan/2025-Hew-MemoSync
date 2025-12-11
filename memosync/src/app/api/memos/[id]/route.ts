// src/app/api/memos/[id]/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ↓ params の型定義を Promise にする必要があります

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ★変更
) {
  const { id } = await params; // ★必ず await する

  try {
    const memo = await prisma.memo.findUnique({
      where: { id },
    });
    return NextResponse.json(memo);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching memo' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ★変更
) {
  const { id } = await params; // ★必ず await する

  try {
    const body = await request.json();
    const { title, content, isSchedule, createdAt } = body;

    const memo = await prisma.memo.update({
      where: { id },
      data: {
        title,
        content,
        // ここで isSchedule を更新・維持する
        isSchedule: isSchedule, 
        createdAt: createdAt ? new Date(createdAt) : undefined,
      },
    });

    return NextResponse.json(memo);
  } catch (error) {
    console.error(error); // エラーログを出す
    return NextResponse.json({ error: 'Error updating memo' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ★変更
) {
  const { id } = await params; // ★必ず await する

  try {
    await prisma.memo.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting memo' }, { status: 500 });
  }
}