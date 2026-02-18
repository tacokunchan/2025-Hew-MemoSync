import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
                password: true, // Select password to check existence
                authorship: true, // Needed for type and client logic
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        // Convert to client-safe format
        const safeSharedMemos = sharedMemos.map(memo => {
            const hasPass = !!memo.password && memo.password.length > 0;
            return {
                ...memo,
                content: hasPass ? "" : memo.content, // Redact content if password exists
                handwriting: hasPass ? "" : memo.handwriting, // Redact handwriting
                authorship: hasPass ? "" : memo.authorship, // Redact authorship
                hasPassword: hasPass,
                password: undefined // Do not send password to client
            };
        });

        return NextResponse.json(safeSharedMemos);
    } catch (error) {
        console.error('Failed to ask shared memos - Full Error:', error);
        // 詳細なエラーメッセージを返すように一時的に変更（デバッグ用）
        return NextResponse.json({ error: `Failed to fetch shared memos: ${(error as Error).message}` }, { status: 500 });
    }
}
