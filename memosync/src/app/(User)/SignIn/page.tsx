import React from 'react';
import styles from './SignIn.module.css'; // 作成したCSSをインポート

const SignInPage = () => {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>サインイン</h1>
        <form>
          {/* ユーザー名 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              ユーザー名
              <input 
                type="text" 
                name="username" 
                className={styles.input} 
                placeholder="ユーザー名を入力"
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