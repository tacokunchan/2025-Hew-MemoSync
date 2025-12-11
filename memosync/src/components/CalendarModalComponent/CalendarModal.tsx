'use client';

import React, { useState } from 'react';
import Calendar from 'react-calendar';
import styles from './CalendarModal.module.css';

// カレンダーのデフォルトスタイルが必要な場合はインポートしてください
// import 'react-calendar/dist/Calendar.css'; 
// ※ただし今回はmodule.cssで大幅に上書きしているため不要、もしくは競合に注意してください

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
  onCreateForDate: (date: Date) => void;
};

export default function CalendarModal({
  isOpen,
  onClose,
  memos,
  onSelectMemo,
  onCreateForDate
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  if (!isOpen) return null;

  // タイルごとのコンテンツ描画
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
              {memo.title || '無題'}
            </div>
          ))}
          {dayMemos.length > 3 && (
            <div className={styles.moreCount}>
              +{dayMemos.length - 3}
            </div>
          )}
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

  const handleCreateClick = () => {
    onCreateForDate(selectedDate);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* ヘッダー */}
        <div className={styles.header}>
          <h2>📅 メモカレンダー</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        {/* カレンダー本体エリア */}
        <div className={styles.calendarWrapper}>
          <Calendar
            value={selectedDate}
            onChange={(d) => setSelectedDate(d as Date)}
            tileContent={getTileContent}
            locale="ja-JP"
            className={styles.customCalendar}
            showNeighboringMonth={true}
          />
        </div>

        {/* 下部リストエリア */}
        <div className={styles.memoList}>
          <div className={styles.listHeader}>
            <h3>
              {selectedDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
            </h3>
            <button onClick={handleCreateClick} className={styles.createDateButton}>
              ＋ 新規作成
            </button>
          </div>

          <div className={styles.listContainer}>
            {filteredMemos.length > 0 ? (
              <ul>
                {filteredMemos.map((memo) => (
                  <li key={memo.id} onClick={() => { onSelectMemo(memo); onClose(); }}>
                    <span className={styles.listMemoTitle}>{memo.title || '無題'}</span>
                    <span className={styles.memoTime}>
                      {new Date(memo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.empty}>
                <span>この日のメモはありません</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}