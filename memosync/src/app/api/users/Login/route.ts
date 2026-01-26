import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // 1. リクエストからデータを取得
    const body = await request.json();
    const { email, password } = body;

    // 2. まずメールアドレスだけでユーザーを検索
    // findUniqueの条件には、原則として@uniqueがついているカラム（emailなど）しか指定できません
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    // 3. ユーザーが存在しない、またはパスワードが一致しない場合
    // ※注意: 本番環境ではパスワードはハッシュ化(bcrypt等)して比較する必要があります
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが間違っています" },
        { status: 401 } // 認証失敗は401
      );
    }

    // 4. ログイン成功
    // クライアントにパスワードを返さないように除外するのが一般的です
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 200 });

  } catch (error) {
    console.error("ログインエラー:", error);
    return NextResponse.json(
      { error: "ログイン処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}