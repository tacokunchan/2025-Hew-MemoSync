'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import MemoHeader from '@/components/MemoHeaderComponent/MemoHeader';
import MemoSidebar from '@/components/MemoSidebarComponent/MemoSidebar';

import styles from './editor.module.css';

// ★修正1: MemoSidebarに合わせて型定義を更新（isScheduleを追加）
type Memo = {
  id: string;
  title: string;
  content: string;
  updatedAt?: string;
  createdAt: string;
  isSchedule?: boolean; // これがないとサイドバーで予定として認識されません
};

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const memoId = params.id as string;

  // エディタの状態
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // メモリストの状態
  const [memos, setMemos] = useState<Memo[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [isPreview, setIsPreview] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);

  // 1. ユーザーIDの確保
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      router.push('/components/LogInComponent/LogIn');
      return;
    }
    setUserId(storedUserId);
  }, [router]);

  // 2. メモ一覧取得関数
  const fetchMemos = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/memos?userId=${userId}`, {
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      if (res.ok) {
        const data = await res.json();
        setMemos(data);
      }
    } catch (error) {
      console.error("Failed to fetch memos", error);
    }
  }, [userId]);

  // 3. 初回読み込み
  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  // 4. 個別メモデータの取得（エディタ表示用）
  useEffect(() => {
    if (!userId || memoId === 'new') return;
    const fetchMemoData = async () => {
      const res = await fetch(`/api/memos/${memoId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title);
        setContent(data.content || '');
      }
    };
    fetchMemoData();
  }, [userId, memoId]);

  // 5. 自動保存機能
  useEffect(() => {
    if (memoId === 'new') return;
    if (!title && !content) return;
    if (!userId) return;

    const timer = setTimeout(async () => {
      const body = { title, content, userId };

      try {
        const res = await fetch(`/api/memos/${memoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const savedMemo: Memo = await res.json();

          // ★修正2: 自動保存時もリスト(memos)の中身を最新情報に差し替える
          // これにより、タイトル変更などがサイドバーに即座に反映されます
          setMemos((prevMemos) =>
            prevMemos.map((memo) =>
              memo.id === savedMemo.id ? savedMemo : memo
            )
          );
          
          console.log('自動保存完了: サイドバー更新'); 
        }
      } catch (error) {
        console.error("Auto-save failed", error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, content, memoId, userId]);

  // 6. 手動保存ボタン処理
  const handleSubmit = async () => {
    if (!userId) return;

    const body = { title, content, userId };
    const url = memoId === 'new' ? '/api/memos' : `/api/memos/${memoId}`;
    const method = memoId === 'new' ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const savedMemo: Memo = await res.json();

        // ★修正3: 保存したデータでリストを直接更新（リアルタイム反映）
        setMemos((prevMemos) => {
          if (memoId === 'new') {
            // 新規: 先頭に追加
            return [savedMemo, ...prevMemos];
          } else {
            // 編集: 該当IDのメモをサーバーからの最新データに置き換え
            return prevMemos.map((memo) =>
              memo.id === savedMemo.id ? savedMemo : memo
            );
          }
        });

        if (memoId === 'new') router.push('/');
      }
    } catch (error) {
      console.error("Save failed", error);
    }
  };

  // 7. 削除処理
  const handleDelete = async () => {
    if (!confirm('削除しますか？')) return;

    try {
      const res = await fetch(`/api/memos/${memoId}`, { method: 'DELETE' });
      if (res.ok) {
        // ★修正4: 削除時もリストから即座に除外
        setMemos((prevMemos) => prevMemos.filter((memo) => memo.id !== memoId));
        router.push('/');
      }
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  return (
    <div className={styles.fullScreenContainer}>
      {/* memosステートを渡すことで、更新があるたびにサイドバーが再描画されます */}
      <MemoSidebar
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        memos={memos} 
        currentMemoId={memoId}
        onSelect={(memo) => router.push(`/memo/${memo.id}`)}
        onCreateNew={() => router.push('/memo/new')}
        onOpenCalendar={() => { }}
      />

      <div className={styles.mainContent}>
        <MemoHeader
          title={title}
          setTitle={setTitle}
          onToggleNav={() => setIsNavOpen(!isNavOpen)}
          onSave={handleSubmit}
          onDelete={memoId !== 'new' ? handleDelete : undefined}
          isPreview={isPreview}
          setIsPreview={setIsPreview}
          showEditorControls={true}
        />

        <main className={styles.editorBody}>
          {isPreview ? (
            <div className={styles.previewArea}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              placeholder="Markdownを入力..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={styles.textArea}
            />
          )}
        </main>
      </div>
    </div>
  );
}