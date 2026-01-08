import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic'; // Ensure not cached

export async function GET() {
    try {
        const sharedMemos = await prisma.memo.findMany({
            where: {
                isShared: true,
            },
            select: {
                id: true,
                title: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                isSchedule: true,
                category: true,
                userId: true,
                isShared: true,
                handwriting: true,
                color: true,
                // Do NOT return password
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
        return NextResponse.json(sharedMemos);
    } catch (error) {
        console.error('Failed to ask shared memos', error);
        return NextResponse.json({ error: 'Failed to fetch shared memos' }, { status: 500 });
    }
}
