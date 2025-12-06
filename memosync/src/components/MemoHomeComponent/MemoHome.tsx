'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './MemoHome.module.css';

type Memo = {
  id: string;
  title: string;
  content: string;
  updatedAt?: string; // 更新日時もあると便利
};

export default function Home() {
  const router = useRouter();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);

  // フォーム用State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      router.push('/components/LogInComponent/LogIn');
      return;
    }
    setUserId(storedUserId);
    fetchMemos(storedUserId);
  }, []);

  const fetchMemos = async (uid: string) => {
    const res = await fetch(`/api/memos?userId=${uid}`);
    if (res.ok) {
      const data = await res.json();
      setMemos(data);
    }
  };

  // 作成・更新処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (editingId) {
      // 更新
      await fetch(`/api/memos/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
    } else {
      // 新規作成
      await fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, userId }),
      });
    }

    // 完了後、フォームをクリアして新規作成モードに戻す
    handleNewMemo(); 
    fetchMemos(userId);
    setIsNavOpen(false); // スマホなら保存時にメニューを閉じると親切
  };

  // 削除処理（メイン画面のボタンから実行）
  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm('このメモを削除しますか？')) return;
    
    await fetch(`/api/memos/${editingId}`, { method: 'DELETE' });
    
    handleNewMemo(); // フォームをクリア
    if (userId) fetchMemos(userId);
  };

  // サイドバーのリストをクリックした時
  const handleMemoSelect = (memo: Memo) => {
    setEditingId(memo.id);
    setTitle(memo.title);
    setContent(memo.content);
    setIsNavOpen(false); // 選択したらメニューを閉じる
  };

  // 「新規作成」ボタンを押した時（フォームをクリア）
  const handleNewMemo = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setIsNavOpen(false);
  };

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      localStorage.removeItem('userId');
      router.push('/components/LogInComponent/LogIn');
    }
  };

  return (
    <div className={styles.container}>
      
      {/* 1. 暗幕 */}
      <div 
        className={`${styles.overlay} ${isNavOpen ? styles.overlayOpen : ''}`} 
        onClick={() => setIsNavOpen(false)}
      />

      {/* 2. サイドバー（ここに一覧を入れる） */}
      <nav className={`${styles.sidebar} ${isNavOpen ? styles.sidebarOpen : ''}`}>
        
        {/* サイドバー上部：操作ボタン */}
        <div className={styles.sidebarHeader}>
          <button onClick={handleNewMemo} className={styles.newButton}>
            ＋ 新しいメモ
          </button>
          <button onClick={handleLogout} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
            ログアウト
          </button>
        </div>

        {/* メモ一覧リスト */}
        <ul className={styles.memoList}>
          {memos.map((memo) => (
            <li 
              key={memo.id} 
              className={`${styles.memoItem} ${editingId === memo.id ? styles.activeMemo : ''}`}
              onClick={() => handleMemoSelect(memo)}
            >
              <h3 className={styles.memoTitle}>{memo.title}</h3>
              {/* 日付などを出すとおしゃれですが今回はシンプルに */}
            </li>
          ))}
          {memos.length === 0 && (
            <li style={{ padding: '20px', color: '#888', textAlign: 'center' }}>
              メモがありません
            </li>
          )}
        </ul>
      </nav>

      {/* 3. メインエリア */}
      <div className={styles.header}>
        {/* ハンバーガーボタン */}
        <button className={styles.menuButton} onClick={() => setIsNavOpen(true)}>
          <div className={styles.bar}></div>
          <div className={styles.bar}></div>
          <div className={styles.bar}></div>
        </button>
        <h1>{editingId ? '編集中' : '新規作成'}</h1>
      </div>

      <div className={styles.formArea}>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="タイトルを入力"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
            required
          />
          <textarea
            placeholder="ここにメモを入力..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={styles.textarea}
          />
          
          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.saveButton}>
              {editingId ? '更新して保存' : '保存する'}
            </button>
            
            {/* 編集中のみ削除ボタンを表示 */}
            {editingId && (
              <button 
                type="button" 
                onClick={handleDelete} 
                className={styles.deleteButton}
              >
                削除
              </button>
            )}
          </div>
        </form>
      </div>

    </div>
  );
}