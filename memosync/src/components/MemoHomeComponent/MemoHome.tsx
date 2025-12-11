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
};

export default function Home() {
  const router = useRouter();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // エディタの状態
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // ★追加: 新規作成時のターゲット日付（指定がなければnull）
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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
        // 作成日時の新しい順に並び替え
        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return dateB - dateA; // 降順
        });
        setMemos(sortedData);
      }
    } catch (error) {
      console.error("Failed to fetch memos", error);
    }
  };

  

  // ★修正: 保存処理
 // 保存処理
// Home.tsx

// ... (前略)

  const handleSave = async () => {
    if (!userId) return;

    try {
      // ★修正: 「予定(isSchedule)」かどうかを判定するロジック
      let isSchedule = false;

      if (targetDate) {
        // 今日の0時0分0秒を取得
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // ターゲット日付の0時0分0秒を取得（コピーして操作）
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);

        // 「ターゲット日付」が「今日」よりも未来（明日以降）なら予定とする
        if (target.getTime() > today.getTime()) {
          isSchedule = true;
        }
      }

      // --- 新規作成・更新の共通ボディ ---
      const baseBody = {
        title,
        content,
        userId,
        isSchedule, // ★ここで判定結果を入れる
        // 日付指定があればその日時、なければ現在日時
        createdAt: targetDate ? targetDate.toISOString() : (selectedId ? undefined : new Date().toISOString()),
      };

      if (selectedId) {
        // 更新 (PUT)
        await fetch(`/api/memos/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(baseBody),
        });
      } else {
        // 新規作成 (POST)
        await fetch('/api/memos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(baseBody),
        });
      }

      // ... (後略: リスト更新やアラートなど)
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
      if (userId) await fetchMemos(userId);
      handleCreateNew(); 
    } catch (error) {
      console.error("Failed to delete", error);
    }
  };

  const handleSelectMemo = (memo: Memo) => {
    setSelectedId(memo.id);
    setTitle(memo.title);
    setContent(memo.content);
    setIsPreview(false);
    setTargetDate(null); // 既存メモ選択時は日付指定をリセット
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setTitle('');
    setContent('');
    setIsPreview(false);
    setTargetDate(null); // 通常の新規作成は日付指定なし
    if (window.innerWidth < 768) setIsNavOpen(false);
  };

  // ★追加: カレンダーから日付指定で新規作成を開始する関数
  const handleCreateForDate = (date: Date) => {
    setSelectedId(null);
    // 日付と時刻を合わせる（例えばその日の朝9時などにするか、現在はクリックした瞬間の時刻にするか）
    // ここでは日付情報はそのまま保持し、時刻は現在の時刻を混ぜるか、シンプルに00:00にするか等選べます
    // 今回は「日付」が重要なので、渡されたdateをそのまま使います
    setTargetDate(date);
    
    // フォームをリセットしてエディタへ
    setTitle('');
    setContent('');
    setIsPreview(false);
    
    // サイドバーを閉じる（スマホの場合）
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
          // ★日付指定モードならタイトル入力欄にプレースホルダーで日付を出すなどの工夫も可能
          title={title}
          setTitle={setTitle}
          onToggleNav={() => setIsNavOpen(!isNavOpen)}
          onSave={handleSave}
          onDelete={selectedId ? handleDelete : undefined}
          isPreview={isPreview}
          setIsPreview={setIsPreview}
          showEditorControls={true}
        />

        {/* ★日付指定モードの時、エディタの上に「2025/12/25 の予定を作成中」などを出すと親切です 
           （任意実装）
        */}
        {targetDate && !selectedId && (
          <div style={{ padding: '10px 30px', background: '#e6f7ff', color: '#0070f3', fontSize: '0.9rem' }}>
            📅 <b>{targetDate.toLocaleDateString()}</b> のメモを作成中
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
        // ★追加: 関数を渡す
        onCreateForDate={handleCreateForDate}
      />
    </div>
  );
}