import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // prismaのパスは環境に合わせてください
import bcrypt from 'bcryptjs';
import { error } from 'console';
export async function POST(request: Request) {
  try {
    // 1. リクエストボディをJSONとしてパースする
    const body = await request.json();

    // 2. 変数を分割代入で取り出す
    const { email, username, password } = body;

    // データが空でないかチェック（推奨）
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "必要な情報が不足しています" },
        { status: 400 }
      );
    }

    // 3. 既存ユーザー確認
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email, // ここで確実に文字列のemailが渡されます
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "既に登録されています" },
        { status: 400 }
      );
    }
    //bcryptは一方通行なのでハッシュ化したものをもとに戻すことはできない。
    //そのため、ハッシュ化したものをデータベースに保存する。
    //ログイン時に認証するときは、ユーザが打ったものを再ハッシュして比べる。
    const hashedPassword = await bcrypt.hash(password, 10);

    // ... ユーザー作成処理へ続く ...
    const SignUpProsess = await prisma.user.create({
      data: {
        email: email,
        username: username,
        password: password,
        //password: hashedPassword, // 本番環境ではパスワードはハッシュ化することを強く推奨します
      },
    })
    if (!SignUpProsess) {
      console.error("サインインエラー:", error);
      return;
    } else if (SignUpProsess) {
      console.log("サインイン成功");
    }


    return NextResponse.json({ message: "登録完了" }, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}