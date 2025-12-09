'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import MemoHeader from '@/components/MemoHeaderComponent/MemoHeader';
import MemoSidebar from '@/components/MemoSidebarComponent/MemoSidebar';

import styles from './editor.module.css';

// 型定義
type Memo = {
  id: string;
  title: string;
  content: string;
  updatedAt?: string;
  createdAt: string;
};

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const memoId = params.id as string;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [memos, setMemos] = useState<Memo[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [isPreview, setIsPreview] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      router.push('/components/LogInComponent/LogIn');
      return;
    }
    setUserId(storedUserId);

    fetchMemos(storedUserId);
    if (memoId !== 'new') {
      fetchMemoData(memoId);
    }
  }, [memoId]);

  const fetchMemos = async (uid: string) => {
    const res = await fetch(`/api/memos?userId=${uid}`);
    if (res.ok) setMemos(await res.json());
  };

  const fetchMemoData = async (id: string) => {
    const res = await fetch(`/api/memos/${id}`);
    if (res.ok) {
      const data = await res.json();
      setTitle(data.title);
      setContent(data.content);
    }
  };

  const handleSubmit = async () => {
    if (!userId) return;
    const body = { title, content, userId };
    const url = memoId === 'new' ? '/api/memos' : `/api/memos/${memoId}`;
    const method = memoId === 'new' ? 'POST' : 'PUT';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    // 保存後は最新リストを取得してリロード
    fetchMemos(userId); 
    // もし一覧に戻りたいなら router.push('/') ですが、
    // 編集画面に留まるならそのままでOK
    if (memoId === 'new') router.push('/'); 
  };

  const handleDelete = async () => {
    if (!confirm('削除しますか？')) return;
    await fetch(`/api/memos/${memoId}`, { method: 'DELETE' });
    router.push('/');
  };

  return (
    <div className={styles.fullScreenContainer}>
      
      {/* 1. 左側: サイドバー */}
      <MemoSidebar 
        isOpen={isNavOpen} 
        onClose={() => setIsNavOpen(false)} 
        memos={memos}
        currentMemoId={memoId}
        onSelect={(memo) => router.push(`/memo/${memo.id}`)}
        onCreateNew={() => router.push('/memo/new')}
        onOpenCalendar={() => {}} 
      />

      {/* 2. 右側: メインエリア（ヘッダーとエディタをまとめる） */}
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