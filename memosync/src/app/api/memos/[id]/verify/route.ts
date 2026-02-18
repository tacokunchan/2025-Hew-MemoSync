import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { password } = await req.json();
        const { id } = params;

        const memo = await prisma.memo.findUnique({
            where: { id },
        });

        if (!memo) {
            return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
        }

        // Verify password
        if (memo.password && memo.password !== password) {
            return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
        }

        // Return full content
        // We do NOT return the password itself, just the content
        const { password: _, ...safeMemo } = memo;
        return NextResponse.json(safeMemo);

    } catch (error) {
        console.error('Verification failed:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
