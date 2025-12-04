import { prisma } from './lib/prisma'



export const signInUser = async (email: string, password: string) => {
    // Prismaクライアントのインスタンスを作成
    const prisma = new PrismaClient();
    try {
        // ユーザーをメールアドレスとパスワードで検索
        const user = await prisma.user.findUnique({
            where: {
                email: email,
            },
        })
    } catch (error) {
        console.error("サインインエラー:", error);
        throw error;
    } }