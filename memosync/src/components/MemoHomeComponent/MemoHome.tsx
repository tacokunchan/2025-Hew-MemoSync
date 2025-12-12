'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import MemoHeader from '@/components/MemoHeaderComponent/MemoHeader';
import MemoSidebar from '@/components/MemoSidebarComponent/MemoSidebar';
import CalendarModal from '@/components/CalendarModalComponent/CalendarModal';

import styles from './MemoHome.module.css';

type Memo = {
  id: string;
  title: string;
  content: string;
  updatedAt?: string;
  createdAt: string;
  isSchedule?: boolean;
  color?: string;
  category?: string;
};

export default function Home() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // ★重要: これが入っているときは「予定作成モード」とする
  const [targetDate, setTargetDate] = useState<Date | null>(null);

  const [color, setColor] = useState<string>('blue'); // Default color for plans
  const [category, setCategory] = useState<string>('なし'); // Default category for memos

  const [isNavOpen, setIsNavOpen] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // デバッグ用ログ
  useEffect(() => {
    console.log('📊 Memos updated:', {
      total: memos.length,
      schedules: memos.filter(m => m.isSchedule).length,
      normalMemos: memos.filter(m => !m.isSchedule).length
    });
  }, [memos]);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      router.push('/components/LogInComponent/LogIn');
      return;
    }
    setUserId(storedUserId);
    fetchMemos(storedUserId);

    if (window.innerWidth < 768) {
      setIsNavOpen(false);
    }
  }, []);

  const fetchMemos = async (uid: string) => {
    try {
      const res = await fetch(`/api/memos?userId=${uid}`);
      if (res.ok) {
        const data: Memo[] = await res.json();
        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return dateB - dateA;
        });
        setMemos(sortedData);
      }
    } catch (error) {
      console.error("Failed to fetch memos", error);
    }
  };

  // リアルタイム反映（楽観的UI更新）
  useEffect(() => {
    if (!selectedId) return;
    if (!title && !content) return;

    setMemos((prevMemos) =>
      prevMemos.map((memo) =>
        memo.id === selectedId
          ? {
            ...memo,
            title: title || memo.title,
            content: content,
            updatedAt: new Date().toISOString(),
          }
          : memo
      )
    );
  }, [title, content, selectedId]);

  // ★自動保存ロジック（修正版）
  useEffect(() => {
    if (!selectedId) return;
    if (!title && !content) return;
    if (!userId) return;

    const timer = setTimeout(async () => {

      // ★サーバーへのfetchは行わず、手元のmemosから現在の情報を取得
      const currentMemo = memos.find(m => m.id === selectedId);
      if (!currentMemo) return; // 手元にない場合はスキップ

      try {
        const res = await fetch(`/api/memos/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            userId,
            // ★手元のデータの状態（メモor予定）を維持する
            isSchedule: currentMemo.isSchedule ?? false,
            createdAt: currentMemo.createdAt,
          }),
        });

        if (res.ok) {
          const savedMemo: Memo = await res.json();
          // 保存完了したデータでStateを更新（整合性を保つ）
          setMemos((prevMemos) =>
            prevMemos.map((memo) =>
              memo.id === savedMemo.id ? savedMemo : memo
            )
          );
        }
      } catch (error) {
        console.error("❌ Auto-save failed", error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, content, selectedId, userId, memos]);

  // ★手動保存ロジック（修正版）
  const handleSave = async () => {
    if (!userId) return;

    try {
      if (selectedId) {
        // ■ 既存データの更新
        // 手元のデータから現在のisScheduleを取得
        const currentMemo = memos.find(m => m.id === selectedId);
        if (!currentMemo) return;

        const res = await fetch(`/api/memos/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            userId,
            isSchedule: currentMemo.isSchedule ?? false, // 状態維持
            color,
            category,
            createdAt: currentMemo.createdAt,
          }),
        });

        if (res.ok) {
          const savedMemo: Memo = await res.json();
          setMemos((prevMemos) =>
            prevMemos.map((memo) =>
              memo.id === savedMemo.id ? savedMemo : memo
            )
          );
        }
      } else {
        // ■ 新規作成
        // targetDate がセットされているなら「予定」、なければ「メモ」
        const isSchedule = targetDate !== null;
        console.log('Creating new:', { isSchedule, targetDate });

        const res = await fetch('/api/memos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            userId,
            isSchedule,
            color,
            category,
            createdAt: targetDate ? targetDate.toISOString() : new Date().toISOString(),
          }),
        });

        if (res.ok) {
          const newMemo: Memo = await res.json();
          setMemos((prevMemos) => [newMemo, ...prevMemos]);
          setSelectedId(newMemo.id);

          if (isSchedule) {
            alert('カレンダーに予定を追加しました');
            // 予定作成後は、混乱を防ぐためメモ作成モード（リセット）に戻す
            handleCreateNew();
          } else {
            alert('メモを作成しました');
          }
        }
      }
    } catch (error) {
      console.error("Failed to save", error);
      alert('保存に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm('削除しますか？')) return;

    try {
      await fetch(`/api/memos/${selectedId}`, { method: 'DELETE' });
      setMemos((prevMemos) => prevMemos.filter((memo) => memo.id !== selectedId));
      handleCreateNew();
    } catch (error) {
      console.error("Failed to delete", error);
    }
  };

  // メモ選択時の処理
  const handleSelectMemo = (memo: Memo) => {
    console.log('📝 Selected memo:', memo);
    setSelectedId(memo.id);
    setTitle(memo.title);
    setContent(memo.content);
    setColor(memo.color || 'blue');
    setCategory(memo.category || 'なし');
    setIsPreview(false);
    // ★既存のものを開くときは日付指定モードを解除
    setTargetDate(null);
  };

  // 「＋新規」ボタン（メモ作成）
  const handleCreateNew = () => {
    console.log('➕ Create new memo (not schedule)');
    setSelectedId(null);
    setTitle('');
    setContent('');
    setColor('blue');
    setCategory('なし');
    setIsPreview(false);
    // ★日付指定を解除＝メモモード
    setTargetDate(null);
    if (window.innerWidth < 768) setIsNavOpen(false);
  };

  // カレンダーから日付をクリックした時（予定作成）
  const handleCreateForDate = (date: Date) => {
    console.log('📅 Create new schedule for:', date);
    setSelectedId(null);
    // ★日付を指定＝予定モード
    // ★日付を指定＝予定モード
    setTargetDate(date);
    setTitle('');
    setContent('');
    setColor('blue');
    setCategory('なし');
    setIsPreview(false);

    // カレンダーを閉じる
    setIsCalendarOpen(false);
    if (window.innerWidth < 768) setIsNavOpen(false);
  };

  return (
    <div className={styles.appContainer}>

      <MemoSidebar
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        memos={memos}
        currentMemoId={selectedId}
        onSelect={handleSelectMemo}
        onCreateNew={handleCreateNew}
        onOpenCalendar={() => setIsCalendarOpen(true)}
      />

      <div className={styles.mainArea}>

        <MemoHeader
          title={title}
          setTitle={setTitle}
          onToggleNav={() => setIsNavOpen(!isNavOpen)}
          onSave={handleSave}
          onDelete={selectedId ? handleDelete : undefined}
          isPreview={isPreview}
          setIsPreview={setIsPreview}
          showEditorControls={true}
        />

        {/* ユーザーへの現在のモード表示 */}
        {targetDate && !selectedId && (
          <div style={{ padding: '10px 30px', background: '#e6f7ff', color: '#0070f3', fontSize: '0.9rem' }}>
            📅 <b>{targetDate.toLocaleDateString()}</b> の予定を作成中
          </div>
        )}

        {/* 色選択（予定の場合） */}
        {targetDate && (
          <div style={{ padding: '0 30px 10px 30px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>色:</span>
            {['red', 'blue', 'green', 'purple', 'pink'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: c === 'red' ? '#ffcccc' : c === 'blue' ? '#cceeff' : c === 'green' ? '#ccffcc' : c === 'purple' ? '#eeccee' : '#ffccee',
                  border: color === c ? `2px solid ${c}` : '1px solid #ddd',
                  cursor: 'pointer',
                }}
                title={c}
              />
            ))}
          </div>
        )}

        {/* カテゴリ選択（メモの場合） */}
        {!targetDate && (
          <div style={{ padding: '0 30px 10px 30px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>カテゴリ:</span>
            {['なし', '重要', '課題', 'アイデア', 'その他'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  border: '1px solid #ddd',
                  backgroundColor: category === cat ? '#333' : '#f5f5f5',
                  color: category === cat ? '#fff' : '#333',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <main className={styles.editorBody}>
          {isPreview ? (
            <div className={styles.previewArea}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || '(本文なし)'}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              className={styles.textArea}
              placeholder="Markdown形式でメモを入力..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          )}
        </main>
      </div>

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        memos={memos}
        onSelectMemo={handleSelectMemo}
        onCreateForDate={handleCreateForDate}
      />
    </div>
  );
}