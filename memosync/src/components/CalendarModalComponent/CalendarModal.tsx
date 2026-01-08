'use client';

import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import styles from './CalendarModal.module.css';

type Memo = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isSchedule?: boolean;
  color?: string;
  userId: string;
  isShared?: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  memos: Memo[];
  onSelectMemo: (memo: Memo) => void;
  onCreateForDate: (date: Date) => void;
};

// 色のマッピング関数（CSS変数で管理しても良いが、ここではJSでコードを返す）
const getColorCode = (colorName?: string) => {
  switch (colorName) {
    case 'red': return '#fca5a5'; // lighter red
    case 'blue': return '#93c5fd'; // lighter blue
    case 'green': return '#6ee7b7'; // lighter green
    case 'purple': return '#c4b5fd'; // lighter purple
    case 'pink': return '#f9a8d4'; // lighter pink
    default: return '#525252'; // lighter black (gray)
  }
};

export default function CalendarModal({
  isOpen,
  onClose,
  memos,
  onSelectMemo,
  onCreateForDate
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // マウント時に今日の日付をセット
  useEffect(() => {
    setSelectedDate(new Date());
  }, [isOpen]); // isOpenが変わるたびに今日に戻すか、状態を保持するかは要件次第ですが、ここでは開くたびにリセットしないように空配列かisOpen依存か調整可能。今回はシンプルに初期化時のみ。

  if (!isOpen || !selectedDate) return null;

  // タイルごとのコンテンツ描画
  const getTileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;

    // 日付の一致判定
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
            <div
              key={memo.id}
              className={styles.tileMemoTitle}
              style={{
                // 背景色ではなく、左のボーダー色として使うことでシンプルさを保つ
                borderLeftColor: getColorCode(memo.color)
              }}
            >
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

  // 選択された日のメモ一覧用フィルタ
  const filteredMemos = memos.filter((memo) => {
    const memoDate = new Date(memo.createdAt);
    return (
      memoDate.getFullYear() === selectedDate.getFullYear() &&
      memoDate.getMonth() === selectedDate.getMonth() &&
      memoDate.getDate() === selectedDate.getDate()
    );
  });

  const handleCreateClick = () => {
    if (selectedDate) {
      onCreateForDate(selectedDate);
      onClose(); // モーダルを閉じる
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* ヘッダー */}
        <div className={styles.header}>
          <h2>📅 SCHEDULE</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        {/* コンテンツラッパー（左右分割） */}
        <div className={styles.contentWrapper}>

          {/* 左：カレンダー本体エリア */}
          <div className={styles.calendarWrapper}>
            <Calendar
              value={selectedDate}
              onChange={(d) => setSelectedDate(d as Date)}
              tileContent={getTileContent}
              locale="en-US" // デザインに合わせて英語表記に変更 (ja-JPでも可)
              formatShortWeekday={(locale, date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]} // 曜日を英語3文字に固定
              className={styles.customCalendar}
              showNeighboringMonth={true}
              minDetail="month"
              prev2Label={null} // 1年移動ボタンを消してシンプルに
              next2Label={null}
            />
          </div>

          {/* 右：リストエリア */}
          <div className={styles.memoList}>
            <div className={styles.listHeader}>
              <h3>
                {selectedDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
              </h3>
              <button onClick={handleCreateClick} className={styles.createDateButton}>
                ADD NEW PLAN
              </button>
            </div>

            <div className={styles.listContainer}>
              {filteredMemos.length > 0 ? (
                <ul>
                  {filteredMemos.map((memo) => (
                    <li key={memo.id} onClick={() => { onSelectMemo(memo); onClose(); }}>
                      <span className={styles.listMemoTitle}>{memo.title || 'Untitled'}</span>
                      <span className={styles.memoTime}>
                        {new Date(memo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {/* カテゴリや色の情報をリストにも少し出すならここに追加 */}
                        {memo.color && (
                          <span style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: getColorCode(memo.color),
                            marginLeft: '8px'
                          }} />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.empty}>
                  <span>No plans for this day.</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}