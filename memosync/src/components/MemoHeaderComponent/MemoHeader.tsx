'use client';

import React from 'react';
import styles from './MemoHeader.module.css';

type Props = {
  title?: string;
  setTitle?: (value: string) => void;
  onToggleNav: () => void; // ★これが3本線ボタンの動作
  onSave?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  isPreview?: boolean;
  setIsPreview?: (value: boolean) => void;
  showEditorControls?: boolean;
};

export default function MemoHeader({
  title = '',
  setTitle,
  onToggleNav,
  onSave,
  onDelete,
  onShare,
  isPreview = false,
  setIsPreview,
  showEditorControls = true,
}: Props) {
  return (
    <header className={styles.header}>
      {/* 左側：ハンバーガーボタン */}
      <div className={styles.leftGroup}>
        <button onClick={onToggleNav} className={styles.menuButton}>
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
        </button>
      </div>

      {/* 中央：タイトル入力 */}
      {showEditorControls && setTitle ? (
        <input
          type="text"
          placeholder="タイトルを入力"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.titleInput}
        />
      ) : (
        <h1 className={styles.appTitle}>マイメモ帳</h1>
      )}

      {/* 右側：アクションボタン */}
      {showEditorControls && (
        <div className={styles.actions}>
          {onShare && (
            <button onClick={onShare} className={styles.previewButton} style={{ marginRight: '8px', backgroundColor: '#eebbbb' }}>
              共有
            </button>
          )}
          <button
            onClick={() => setIsPreview && setIsPreview(!isPreview)}
            className={styles.previewButton}
          >
            {isPreview ? '編集' : '確認'}
          </button>
          <button onClick={onSave} className={styles.saveButton}>
            保存
          </button>
          {onDelete && (
            <button onClick={onDelete} className={styles.deleteButton}>
              削除
            </button>
          )}
        </div>
      )}
    </header>
  );
}