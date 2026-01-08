'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './MemoSidebar.module.css';
import { useRouter } from 'next/navigation';

type Memo = {
  id: string;
  title: string;
  content: string;
  updatedAt?: string;
  createdAt: string;
  isSchedule?: boolean;
  category?: string;
  isShared?: boolean;
  userId: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  memos: Memo[];
  sharedMemos: Memo[];
  currentMemoId: string | null;
  onSelect: (memo: Memo) => void;
  onCreateNew: () => void;
  onOpenCalendar: () => void;
  onDelete?: (id: string) => void;
  activeCounts?: Record<string, number>;
};

export default function MemoSidebar({
  isOpen,
  onClose,
  memos,
  sharedMemos,
  currentMemoId,
  onSelect,
  onCreateNew,
  onOpenCalendar,
  activeCounts = {},
}: Props) {
  const router = useRouter();

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      localStorage.removeItem('userId');
      router.push('/LogIn');
    }
  };

  const handleItemClick = (memo: Memo) => {
    onSelect(memo);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  // メモ一覧用のデータ処理 (Personal)
  const personalMemos = memos
    .filter((m) => !m.isSchedule)
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

  // Personalからは「共有中でないもの」だけを表示
  // もし自分がホストの場合、memosにもsharedMemosにも入る可能性がある。
  // ここでは重複を避けるため、memos (my created) のうち isShared=true は Personal に表示しない（Live Roomsに出るから）。
  const filteredPersonalMemos = personalMemos.filter(m => !m.isShared);

  const renderMemoItem = (memo: Memo, isSharedItem: boolean = false) => (
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={styles.itemTitle}>{memo.title || '無題のメモ'}</span>
          {isSharedItem && activeCounts[memo.id] ? (
            <span style={{ backgroundColor: '#00cc00', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem' }}>
              {activeCounts[memo.id]}
            </span>
          ) : null}
        </div>
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
            <button onClick={onOpenCalendar} className={styles.iconButton} title="カレンダー">
              📅
            </button>

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
            {/* Live Rooms Section */}
            {/* Live Rooms Section */}
            <h3 style={{ fontSize: '0.9rem', color: '#666', margin: '10px 15px 5px' }}>Live Rooms</h3>
            <AnimatePresence mode='popLayout'>
              {sharedMemos.length > 0 ? (
                sharedMemos.map(m => renderMemoItem(m, true))
              ) : (
                <li className={styles.emptyItem} style={{ fontSize: '0.8rem', color: '#999' }}>
                  現在、共有中のメモはありません
                </li>
              )}
            </AnimatePresence>
            <div style={{ height: '1px', background: '#ccc', margin: '10px 15px' }}></div>

            {/* Personal Section */}
            <h3 style={{ fontSize: '0.9rem', color: '#666', margin: '10px 15px 5px' }}>Personal</h3>
            <AnimatePresence mode='popLayout'>

              {filteredPersonalMemos.map(m => renderMemoItem(m, false))}

              {filteredPersonalMemos.length === 0 && sharedMemos.length === 0 && (
                <li className={styles.emptyItem} key="empty">
                  メモがありません
                </li>
              )}

            </AnimatePresence>
          </ul>
        </div>

        <div className={styles.footer}>
          <button onClick={handleLogout} className={styles.logoutButton}>
            ログアウト
          </button>
        </div>
      </nav >
    </>
  );
}