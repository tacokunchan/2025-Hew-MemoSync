import { PrismaClient } from ".prisma/client";

const prisma = new PrismaClient();



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