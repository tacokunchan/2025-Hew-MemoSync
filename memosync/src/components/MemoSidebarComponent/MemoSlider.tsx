'use client';

import React from 'react';
import styles from './MemoSidebar.module.css';

type Memo = {
  id: string;
  title: string;
  content: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void; // スマホ用（選んだら閉じる）
  memos: Memo[];
  currentMemoId: string | null;
  onSelect: (memo: Memo) => void; // ★変更: ページ遷移せずデータだけ渡す
  onCreateNew: () => void;        // ★変更: 新規作成ボタンの動作
};

export default function MemoSidebar({
  isOpen,
  onClose,
  memos,
  currentMemoId,
  onSelect,
  onCreateNew,
}: Props) {

  // メモを選んだ時の処理
  const handleItemClick = (memo: Memo) => {
    onSelect(memo);
    // 画面幅が狭い（スマホの）時は、選んだらサイドバーを閉じる
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* スマホ用: サイドバーが開いている時の暗幕 */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
        onClick={onClose}
      />

      <nav className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.header}>
          <h2>メモ一覧</h2>
          <button onClick={onCreateNew} className={styles.newButton}>
            ＋ 新規
          </button>
        </div>
        
        <ul className={styles.list}>
          {memos.map((memo) => (
            <li
              key={memo.id}
              className={`${styles.item} ${memo.id === currentMemoId ? styles.activeItem : ''}`}
              onClick={() => handleItemClick(memo)}
            >
              {memo.title || '無題のメモ'}
            </li>
          ))}
          {memos.length === 0 && (
            <li className={styles.emptyItem}>メモがありません</li>
          )}
        </ul>
      </nav>
    </>
  );
}