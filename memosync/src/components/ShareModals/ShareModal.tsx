import React, { useState, useEffect } from 'react';
import styles from './ShareModals.module.css';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    memoId: string;
    isShared: boolean;
    currentPassword?: string;
    onSave: (enabled: boolean, password?: string) => void;
}

export default function ShareModal({ isOpen, onClose, memoId, isShared, currentPassword, onSave }: ShareModalProps) {
    const [enabled, setEnabled] = useState(isShared);
    const [password, setPassword] = useState(currentPassword || '');

    useEffect(() => {
        if (isOpen) {
            setEnabled(isShared);
            setPassword(currentPassword || '');
        }
    }, [isOpen, isShared, currentPassword]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <h3 className={styles.title}>共有設定</h3>

                <div className={styles.field}>
                    <label className={styles.label}>
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={e => setEnabled(e.target.checked)}
                            style={{ width: '20px', height: '20px' }}
                        />
                        共有を有効にする
                    </label>
                </div>

                {enabled && (
                    <div className={styles.field}>
                        <div style={{ marginBottom: '8px', fontWeight: 500 }}>パスワード（任意）</div>
                        <input
                            type="text"
                            className={styles.input}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="設定しない場合は空欄"
                        />
                        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                            共有ID: {memoId}
                        </p>
                    </div>
                )}

                <div className={styles.actions}>
                    <button className={`${styles.button} ${styles.secondary}`} onClick={onClose}>キャンセル</button>
                    <button className={`${styles.button} ${styles.primary}`} onClick={() => onSave(enabled, password)}>保存</button>
                </div>
            </div>
        </div>
    );
}
