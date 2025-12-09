'use client';

import React, { useState } from 'react';
import Calendar from 'react-calendar';
import styles from './CalendarModal.module.css';

type Memo = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  memos: Memo[];
  onSelectMemo: (memo: Memo) => void;
  // ★追加: 特定の日付で新規作成するための関数を受け取る
  onCreateForDate: (date: Date) => void;
};

export default function CalendarModal({ 
  isOpen, 
  onClose, 
  memos, 
  onSelectMemo,
  onCreateForDate // ★受け取る
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  if (!isOpen) return null;

  const getTileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    const dayMemos = memos.filter((memo) => {
      const memoDate = new Date(memo.createdAt);
      return (
        memoDate.getFullYear() === date.getFullYear() &&
        memoDate.getMonth() === date.getMonth() &&
        memoDate.getDate() === date.getDate()
      );
    });

    if (dayMemos.length > 0) {
      return (
        <div className={styles.tileContent}>
          {dayMemos.slice(0, 3).map((memo) => (
            <div key={memo.id} className={styles.tileMemoTitle}>
              • {memo.title || '無題'}
            </div>
          ))}
          {dayMemos.length > 3 && <div className={styles.moreCount}>+{dayMemos.length - 3}</div>}
        </div>
      );
    }
    return null;
  };

  const filteredMemos = memos.filter((memo) => {
    const memoDate = new Date(memo.createdAt);
    return (
      memoDate.getFullYear() === selectedDate.getFullYear() &&
      memoDate.getMonth() === selectedDate.getMonth() &&
      memoDate.getDate() === selectedDate.getDate()
    );
  });
  

  // ★追加: 新規作成ボタンを押した時の処理
  const handleCreateClick = () => {
    onCreateForDate(selectedDate);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>メモカレンダー</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        
        <div className={styles.calendarWrapper}>
          <Calendar
            value={selectedDate}
            onChange={(d) => setSelectedDate(d as Date)}
            tileContent={getTileContent}
            locale="ja-JP"
            className={styles.customCalendar}
          />
        </div>

        <div className={styles.memoList}>
          {/* ★追加: 日付と新規作成ボタンを横並びに */}
          <div className={styles.listHeader}>
            <h3>{selectedDate.toLocaleDateString()} のメモ</h3>
            <button onClick={handleCreateClick} className={styles.createDateButton}>
              ＋ この日で作成
            </button>
          </div>

          {filteredMemos.length > 0 ? (
            <ul>
              {filteredMemos.map((memo) => (
                <li key={memo.id} onClick={() => { onSelectMemo(memo); onClose(); }}>
                  <span className={styles.listMemoTitle}>{memo.title || '無題'}</span>
                  <span className={styles.memoTime}>
                    {new Date(memo.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>予定・メモはありません</p>
          )}
        </div>
      </div>
    </div>
  );
}