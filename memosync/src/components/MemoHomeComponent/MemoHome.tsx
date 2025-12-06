'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import MemoHeader from '@/components/MemoHeaderComponent/MemoHeader';
import MemoSidebar from '@/components/MemoSidebarComponent/MemoSlider';

// CSS: サイドバーとエディタを横並びにするFlexコンテナ
// 簡易的にインラインまたはグローバルCSSでもいいですが、modules推奨
import styles from './MemoHome.module.css';

type Memo = {
  id: string;
  title: string;
  content: string;
  updatedAt?: string;
};

export default function Home() {
  const router = useRouter();
  
  // --- State管理 ---
  const [userId, setUserId] = useState<string | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  
  // 選択中のメモID (nullなら新規作成モード)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // エディタの中身
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // UI状態
  const [isNavOpen, setIsNavOpen] = useState(true); // PCなら最初から開いておく
  const [isPreview, setIsPreview] = useState(false);

  // --- 初期化 ---
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      router.push('/components/LogInComponent/LogIn');
      return;
    }
    setUserId(storedUserId);
    fetchMemos(storedUserId);

    // スマホならサイドバーを初期状態で閉じる
    if (window.innerWidth < 768) {
      setIsNavOpen(false);
    }
  }, []);

  // --- API連携 ---
  const fetchMemos = async (uid: string) => {
    const res = await fetch(`/api/memos?userId=${uid}`);
    if (res.ok) {
      const data = await res.json();
      setMemos(data);
    }
  };

  // 保存処理
  const handleSave = async () => {
    if (!userId) return;

    if (selectedId) {
      // 更新
      await fetch(`/api/memos/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
    } else {
      // 新規作成
      const res = await fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, userId }),
      });
      if (res.ok) {
        // 新規作成後は、その作成したメモを選択状態にするなどの工夫が可能
        // ここでは簡易的にリセットしてリスト再取得
      }
    }
    // リストを最新にする
    await fetchMemos(userId);
    // 新規作成だった場合、入力内容はそのまま維持するか、クリアするか。
    // 今回は「保存した感」を出すためそのままでOK
    alert('保存しました');
  };

  // 削除処理
  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm('削除しますか？')) return;

    await fetch(`/api/memos/${selectedId}`, { method: 'DELETE' });
    
    // リスト更新＆新規作成モードへ戻る
    await fetchMemos(userId!);
    handleCreateNew(); 
  };

  // --- UI操作 ---
  
  // サイドバーでメモを選択した時
  const handleSelectMemo = (memo: Memo) => {
    setSelectedId(memo.id);
    setTitle(memo.title);
    setContent(memo.content);
    setIsPreview(false); // 編集モードに戻す
  };

  // 「＋新規」ボタンを押した時
  const handleCreateNew = () => {
    setSelectedId(null); // IDをnullに＝新規モード
    setTitle('');
    setContent('');
    setIsPreview(false);
    // スマホならサイドバーを閉じる
    if (window.innerWidth < 768) setIsNavOpen(false);
  };

  return (
    <div className={styles.appContainer}>
      
      {/* 1. 左側: サイドバー */}
      <MemoSidebar
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        memos={memos}
        currentMemoId={selectedId}
        onSelect={handleSelectMemo}
        onCreateNew={handleCreateNew}
      />

      {/* 2. 右側: メインエリア（ヘッダー ＋ エディタ） */}
      <div className={styles.mainArea}>
        
        <MemoHeader
          title={title}
          setTitle={setTitle}
          onToggleNav={() => setIsNavOpen(!isNavOpen)}
          onSave={handleSave}
          onDelete={selectedId ? handleDelete : undefined}
          isPreview={isPreview}
          setIsPreview={setIsPreview}
          showEditorControls={true} // 常時エディタUIを表示
        />

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
    </div>
  );
}