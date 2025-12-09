'use client';

import React from 'react';
import styles from './MemoSidebar.module.css';

type Memo = {
  id: string;
  title: string;
  content: string;
  updatedAt?: string;
  createdAt: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  memos: Memo[];
  currentMemoId: string | null;
  onSelect: (memo: Memo) => void;
  onCreateNew: () => void;
  onOpenCalendar: () => void;
};

export default function MemoSidebar({
  isOpen,
  onClose,
  memos,
  currentMemoId,
  onSelect,
  onCreateNew,
  onOpenCalendar,
}: Props) {

  // メモを選んだ時の処理（ここが動かないと閉じません）
  const handleItemClick = (memo: Memo) => {
    onSelect(memo);
    // 画面幅が768px未満（スマホ）ならサイドバーを閉じる
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* スマホ用: 暗幕（ここをクリックしても閉じるはず） */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
        onClick={onClose}
      />

      <nav className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        {/* ヘッダーエリア */}
        <div className={styles.header}>
          <h2>メモ一覧</h2>
          <div className={styles.headerButtons}>
            {/* カレンダーボタン */}
            <button onClick={onOpenCalendar} className={styles.iconButton} title="カレンダー">
              📅
            </button>
            {/* 新規作成ボタン */}
            <button onClick={() => { onCreateNew(); if(window.innerWidth < 768) onClose(); }} className={styles.newButton}>
              ＋ 新規
            </button>
          </div>
        </div>
        
        {/* リストエリア */}
        <div className={styles.listContainer}>
          <ul className={styles.list}>
            {memos.map((memo) => (
              <li
                key={memo.id}
                className={`${styles.item} ${memo.id === currentMemoId ? styles.activeItem : ''}`}
                onClick={() => handleItemClick(memo)}
              >
                <div className={styles.itemContent}>
                  <span className={styles.itemTitle}>{memo.title || '無題のメモ'}</span>
                  <span className={styles.itemDate}>
                     {new Date(memo.createdAt || memo.updatedAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
            {memos.length === 0 && (
              <li className={styles.emptyItem}>メモがありません</li>
            )}
          </ul>
        </div>
      </nav>
    </>
  );
}