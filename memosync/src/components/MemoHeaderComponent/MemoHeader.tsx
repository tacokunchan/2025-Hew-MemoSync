'use client';

import React from 'react';
import styles from './MemoHeader.module.css';

type Props = {
  // Home画面では渡さないことがあるため ? (オプショナル) をつけます
  title?: string;
  setTitle?: (value: string) => void;
  
  onToggleNav: () => void;

  // エディタ画面用の機能もオプショナルにします
  onSave?: () => void;
  onDelete?: () => void;
  isPreview?: boolean;
  setIsPreview?: (value: boolean) => void;

  // ★今回追加するプロパティ（これがエラーの原因でした）
  showEditorControls?: boolean;
};

export default function MemoHeader({
  title = '',
  setTitle,
  onToggleNav,
  onSave,
  onDelete,
  isPreview = false,
  setIsPreview,
  showEditorControls = true, // 指定がない場合は true (エディタモード) として扱う
}: Props) {
  return (
    <header className={styles.header}>
      {/* ハンバーガーボタン */}
      <button onClick={onToggleNav} className={styles.menuButton}>
        <span className={styles.bar}></span>
        <span className={styles.bar}></span>
        <span className={styles.bar}></span>
      </button>

      {/* タイトル入力エリア: showEditorControls が true なら入力欄、false ならアプリ名を表示 */}
      {showEditorControls && setTitle ? (
        <input
          type="text"
          placeholder="タイトル..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.titleInput}
        />
      ) : (
        <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold', color: '#333' }}>
          マイメモ帳
        </h1>
      )}

      {/* 右上のアクションボタン群: showEditorControls が true の時だけ表示 */}
      {showEditorControls && (
        <div className={styles.actions}>
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