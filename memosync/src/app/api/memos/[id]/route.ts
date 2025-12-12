// src/app/api/memos/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // リクエストボディのチェック
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // テキストとして取得してから JSON パース
    const text = await request.text();
    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: 'Request body is empty' },
        { status: 400 }
      );
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        { status: 400 }
      );
    }

    const { title, content, isSchedule, createdAt, color, category } = body;

    const memo = await prisma.memo.update({
      where: { id },
      data: {
        title,
        content,
        isSchedule: isSchedule,
        color,
        category,
        createdAt: createdAt ? new Date(createdAt) : undefined,
      },
    });

    return NextResponse.json(memo);
  } catch (error) {
    console.error('PUT /api/memos/[id] error:', error);
    return NextResponse.json(
      { error: 'Error updating memo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.memo.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/memos/[id] error:', error);
    return NextResponse.json(
      { error: 'Error deleting memo' },
      { status: 500 }
    );
  }
}