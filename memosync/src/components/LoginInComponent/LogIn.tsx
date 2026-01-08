'use client';

import React from "react";
import styles from './LogIn.module.css';
import { useRouter } from 'next/navigation';

const LogInPageComponent = () => {
    const router = useRouter();

    const [email, setEmail] = React.useState<string>('');
    const [password, setPassword] = React.useState<string>('');

    // エラーメッセージ用のstate
    const [errors, setErrors] = React.useState<{ email?: string; password?: string }>({});
    const [serverError, setServerError] = React.useState<string>('');

    // バリデーション関数
    const validate = () => {
        const newErrors: { email?: string; password?: string } = {};
        let isValid = true;

        if (!email) {
            newErrors.email = "メールアドレスを入力してください";
            isValid = false;
        }

        if (!password) {
            newErrors.password = "パスワードを入力してください";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleLogIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // 前回のサーバーエラーを消す
        setServerError('');

        // バリデーション実行（falseならここで止める）
        if (!validate()) {
            return;
        }

        console.log('ログインボタンがクリックされました');

        try {
            const res = await fetch("/api/users/Login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            // 失敗時（ユーザーが見つからない、パスワード違いなど）
            if (!res.ok) {
                console.error("ログインエラー:", data.error);
                setServerError(data.error || "ログインに失敗しました");
                return;
            }

            // 成功時
            console.log("ログイン成功");
            localStorage.setItem('userId', data.id);
            router.push('/Home');

        } catch (error) {
            console.error("通信エラー:", error);
            setServerError("サーバーとの通信に失敗しました");
        }
    }

    // エラーメッセージのスタイル
    const errorStyle = { color: 'red', fontSize: '0.8rem', marginTop: '5px' };
    const serverErrorStyle = { color: 'red', fontSize: '0.9rem', marginBottom: '10px', textAlign: 'center' as const };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>ログイン</h1>

                {/* サーバーエラーの表示エリア */}
                {serverError && <p style={serverErrorStyle}>{serverError}</p>}

                <form onSubmit={handleLogIn}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            メールアドレス
                            <input
                                type="text"
                                className={styles.input}
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="メールアドレスを入力"
                            />
                        </label>
                        {errors.email && <p style={errorStyle}>{errors.email}</p>}
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            パスワード
                            <input
                                type="password"
                                className={styles.input}
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="パスワードを入力"
                            />
                        </label>
                        {errors.password && <p style={errorStyle}>{errors.password}</p>}
                    </div>

                    <input
                        type="submit"
                        value="ログイン"
                        className={styles.button}
                    />
                    <a href="/" className={styles.link}>新規登録はこちら</a>
                </form>
            </div>
        </div>
    );
}

export default LogInPageComponent;