import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 削除 (DELETE)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    await prisma.memo.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting memo' }, { status: 500 });
  }
}

// 編集 (PUT)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const { title, content } = body;

    const updatedMemo = await prisma.memo.update({
      where: { id },
      data: { title, content },
    });
    return NextResponse.json(updatedMemo);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating memo' }, { status: 500 });
  }
}