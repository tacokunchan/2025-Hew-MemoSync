import React, { useState } from 'react';
import styles from './ShareModals.module.css';

interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (password: string) => void;
    error?: string | null;
}

export default function PasswordModal({ isOpen, onClose, onSubmit, error }: PasswordModalProps) {
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit(password);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <h3 className={styles.title}>パスワードを入力</h3>
                <p style={{ marginBottom: '16px' }}>共有メモに参加するにはパスワードが必要です。</p>

                <div className={styles.field}>
                    <input
                        type="password"
                        className={styles.input}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="パスワード"
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                    {error && <div className={styles.error}>{error}</div>}
                </div>

                <div className={styles.actions}>
                    <button className={`${styles.button} ${styles.secondary}`} onClick={onClose}>キャンセル</button>
                    <button className={`${styles.button} ${styles.primary}`} onClick={handleSubmit}>参加</button>
                </div>
            </div>
        </div>
    );
}
