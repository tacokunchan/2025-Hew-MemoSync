import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();


// サインアップ処理
export async function SignUpProsess(email: string, username: string, password: string) {
  try {
    // 既存ユーザー確認
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return Response.json({ error: "既に登録されています" }, { status: 400 });
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // 新規ユーザー作成
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    return Response.json(user, { status: 201 });
  } catch (error) {
    console.error("登録エラー:", error);
    return Response.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}


// ログイン処理
export async function LoginProsess(email: string, password: string) {
  try{
    const existingUser = await prisma.user.findUnique({ where: { email,password } });
    if (!existingUser) {
      return Response.json({ error: "ユーザーが存在しません" }, { status: 400 });
    }else if(existingUser){
      return Response.json(existingUser, { status: 200 });
    }
  }
  catch (error) {
    console.error("ログインエラー:", error);
    return Response.json({ error: "ログインに失敗しました" }, { status: 500 });
  }
  
}