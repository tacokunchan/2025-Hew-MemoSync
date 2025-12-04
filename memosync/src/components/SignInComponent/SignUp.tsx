"use client";
import React from 'react';
import styles from './SignIn.module.css';

const SignInPage = () => {
  const [email, setEmail] = React.useState<string>('');
  const [username, setUsername] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('サインインボタンがクリックされました');

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email,username, password }),
    });

    const data = await res.json();
    console.log("APIレスポンス:", data);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>サインイン</h1>
        <form onSubmit={handleSignUp}>
          {/* mail*/}
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
          </div>

          {/* ボタン */}
          <input
            type="submit"
            value="サインイン"
            className={styles.button}
          />
        </form>
      </div>
    </div>
  );
};

export default SignInPage;