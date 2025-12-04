import { PrismaClient } from "@prisma/client";

export const signInUser = async (email: string, password: string) => {
    // Prismaクライアントのインスタンスを作成
    const prisma = new PrismaClient();
    try {
        // ユーザーのメールアドレスとパスワードを作成
        const user = await prisma.user.create({
            data: {
                email: email,
                password: password,
            },
        })
        console.log("サインイン成功:", user);
        return user;

    } catch (error) {
        console.error("サインインエラー:", error);
        throw error;
    } }