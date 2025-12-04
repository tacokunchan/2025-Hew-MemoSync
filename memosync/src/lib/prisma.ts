// PrismaClient の型定義をインポート
import { PrismaClient } from "@prisma/client";
// グローバルオブジェクトに prisma プロパティを追加
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// 既存インスタンスがあれば再利用し、なければ新規作成
export const prisma = globalForPrisma.prisma || new PrismaClient();

// 開発環境ではインスタンスをグローバルに保持
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
