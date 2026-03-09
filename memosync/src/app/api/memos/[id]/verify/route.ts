import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { password } = await req.json();
        const { id } = await params;

        const memo = await prisma.memo.findUnique({
            where: { id },
        });

        if (!memo) {
            return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
        }

        if (memo.password && memo.password !== password) {
            return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
        }

        const { password: _, ...safeMemo } = memo;
        return NextResponse.json(safeMemo);

    } catch (error) {
        console.error('Verification failed:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}