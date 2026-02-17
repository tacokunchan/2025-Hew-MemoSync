"use client";
import React from 'react';
import styles from './SignIn.module.css';
import { useRouter } from 'next/navigation';

const SignInPage = () => {
  const router = useRouter();

  const [email, setEmail] = React.useState<string>('');
  const [username, setUsername] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');

  // 入力チェックのエラー用
  const [errors, setErrors] = React.useState<{ email?: string; password?: string }>({});
  // ★追加: サーバー(API)からのエラーメッセージ用
  const [serverError, setServerError] = React.useState<string>('');

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    let isValid = true;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      newErrors.email = "メールアドレスを入力してください";
      isValid = false;
    } else if (!emailPattern.test(email)) {
      newErrors.email = "正しいメールアドレスの形式で入力してください";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "パスワードを入力してください";
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = "パスワードは8文字以上で入力してください";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      return;
    }

    console.log('サインインボタンがクリックされました');

    try {
      const res = await fetch("/api/users/SignUp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      // APIからデータを取得
      const data = await res.json();

      if (!res.ok) {
        // ★修正: エラーだった場合、APIからのメッセージを画面に表示する
        console.error("サインインエラー:", data.error);
        setServerError(data.error || "予期せぬエラーが発生しました");
        return;
      }

      // 成功時
      console.log("サインイン成功");
      router.push('/LogIn');

    } catch (error) {
      console.error("通信エラー:", error);
      setServerError("サーバーとの通信に失敗しました");
    }
  };

  const errorStyle = { color: 'red', fontSize: '0.8rem', marginTop: '5px' };
  // サーバーエラーは少し目立つように中央寄せにするなどのスタイル
  const serverErrorStyle = { color: 'red', fontSize: '0.9rem', marginBottom: '10px', textAlign: 'center' as const };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>サインアップ</h1>

        {/* ★追加: サーバーエラーがあれば、フォームの一番上に表示 */}
        {serverError && <p style={serverErrorStyle}>{serverError}</p>}

        <form onSubmit={handleSignUp}>
          {/* mail */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              メールアドレス
              <input
                type="text"
                name="email"
                className={styles.input}
                placeholder="メールアドレスを入力"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {errors.email && <p style={errorStyle}>{errors.email}</p>}
          </div>

          {/* ユーザー名 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              ユーザー名
              <input
                type="text"
                name="username"
                className={styles.input}
                placeholder="ユーザー名を入力"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
          </div>

          {/* パスワード */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              パスワード
              <input
                type="password"
                name="password"
                className={styles.input}
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {errors.password && <p style={errorStyle}>{errors.password}</p>}
          </div>

          {/* ボタン */}
          <input
            type="submit"
            value="サインアップ"
            className={styles.button}
          />
          <a href="/LogIn" className={styles.link}>すでにアカウントをお持ちの方はこちら</a>
        </form>
      </div>
    </div>
  );
};

export default SignInPage;