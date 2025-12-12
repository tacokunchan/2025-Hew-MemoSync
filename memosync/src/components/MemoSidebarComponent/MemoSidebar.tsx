'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './MemoSidebar.module.css';

type Memo = {
  id: string;
  title: string;
  content: string;
  updatedAt?: string;
  createdAt: string;
  isSchedule?: boolean;
  category?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  memos: Memo[];
  currentMemoId: string | null;
  onSelect: (memo: Memo) => void;
  onCreateNew: () => void;
  onOpenCalendar: () => void;
  onDelete?: (id: string) => void;
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

  const handleItemClick = (memo: Memo) => {
    onSelect(memo);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  // メモ一覧用のデータ処理
  // isScheduleが true のものは除外し、残った「メモ」のみを更新日順にソート
  const memoList = memos
    .filter((m) => !m.isSchedule)
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA; // 新しい順
    });

  const renderMemoItem = (memo: Memo) => (
    <motion.li
      key={memo.id}
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`${styles.item} ${memo.id === currentMemoId ? styles.activeItem : ''}`}
      onClick={() => handleItemClick(memo)}
    >
      <div className={styles.itemContent}>
        <span className={styles.itemTitle}>{memo.title || '無題のメモ'}</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span className={styles.itemDate}>
            {new Date(memo.updatedAt || memo.createdAt).toLocaleDateString()}
          </span>
          {memo.category && memo.category !== 'なし' && (
            <span style={{ fontSize: '0.7rem', backgroundColor: '#eee', padding: '2px 6px', borderRadius: '8px' }}>
              {memo.category}
            </span>
          )}
        </div>
      </div>
    </motion.li>
  );

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
        onClick={onClose}
      />

      <nav className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>

        <div className={styles.header}>
          <h2>メモ一覧</h2>
          <div className={styles.headerButtons}>
            {/* カレンダーを開くボタン */}
            <button onClick={onOpenCalendar} className={styles.iconButton} title="カレンダー">
              📅
            </button>

            {/* 新規メモ作成ボタン */}
            <button
              onClick={() => {
                onCreateNew();
                if (window.innerWidth < 768) onClose();
              }}
              className={styles.newButton}
            >
              ＋ 新規
            </button>
          </div>
        </div>

        <div className={styles.listContainer}>
          <ul className={styles.list}>
            <AnimatePresence mode='popLayout'>

              {memoList.map(renderMemoItem)}

              {memoList.length === 0 && (
                <li className={styles.emptyItem} key="empty">
                  メモがありません
                </li>
              )}

            </AnimatePresence>
          </ul>
        </div>
      </nav>
    </>
  );
}