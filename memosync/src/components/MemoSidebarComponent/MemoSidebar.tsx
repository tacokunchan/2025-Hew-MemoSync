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
  isSchedule?: boolean; // 予定フラグ
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  memos: Memo[];
  currentMemoId: string | null;
  onSelect: (memo: Memo) => void;
  onCreateNew: () => void;
  onOpenCalendar: () => void;
  // onDelete はサイドバーから削除しなくなったので不要なら消しても良いですが
  // 将来的に「×ボタン」などを付けるかもしれないので残しておいても無害です
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

  // --- データの振り分けと並び替え ---

  // 1. 今後の予定 (isSchedule === true) -> 日付が近い順
  const scheduleMemos = memos
    .filter((m) => m.isSchedule)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // 2. 通常のメモ (isSchedule !== true) -> 新しい順
  const normalMemos = memos
    .filter((m) => !m.isSchedule)
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

  // リストアイテムの描画（スワイプ機能を削除）
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
        <span className={styles.itemDate}>
          {memo.isSchedule && '📅 '}
          {new Date(memo.createdAt || memo.updatedAt || Date.now()).toLocaleDateString()}
        </span>
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
        
        {/* ヘッダー */}
        <div className={styles.header}>
          <h2>メモ一覧</h2>
          <div className={styles.headerButtons}>
            <button onClick={onOpenCalendar} className={styles.iconButton} title="カレンダー">
              📅
            </button>
            <button 
              onClick={() => { onCreateNew(); if(window.innerWidth < 768) onClose(); }} 
              className={styles.newButton}
            >
              ＋ 新規
            </button>
          </div>
        </div>
        
        {/* リストエリア */}
        <div className={styles.listContainer}>
          <ul className={styles.list}>
            <AnimatePresence mode='popLayout'>
              
              {/* --- セクション1: 今後の予定 --- */}
              {scheduleMemos.length > 0 && (
                <div className={styles.sectionHeader} key="header-schedule">
                  📅 今後の予定
                </div>
              )}
              {scheduleMemos.map(renderMemoItem)}

              {/* --- セクション2: メモ --- */}
              {normalMemos.length > 0 && (
                <div className={styles.sectionHeader} key="header-normal">
                  📝 メモ
                </div>
              )}
              {normalMemos.map(renderMemoItem)}

              {/* 空の場合 */}
              {memos.length === 0 && (
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