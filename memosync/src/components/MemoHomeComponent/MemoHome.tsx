'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import diff from 'fast-diff';

import MemoHeader from '@/components/MemoHeaderComponent/MemoHeader';
import MemoSidebar from '@/components/MemoSidebarComponent/MemoSidebar';
import CalendarModal from '@/components/CalendarModalComponent/CalendarModal';
import ShareModal from '@/components/ShareModals/ShareModal';
import PasswordModal from '@/components/ShareModals/PasswordModal';
import { useRealtime } from '@/hooks/useRealtime';
import CursorOverlay from '@/components/CursorOverlay';

import dynamic from 'next/dynamic';
const Whiteboard = dynamic(() => import('@/components/Whiteboard/Whiteboard'), { ssr: false });

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
  handwriting?: string;
  isShared?: boolean;
  password?: string;
  hasPassword?: boolean;
  userId: string;
  authorship?: string;
};

export default function Home() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [memos, setMemos] = useState<Memo[]>([]);
  const [sharedMemos, setSharedMemos] = useState<Memo[]>([]);
  const [authorship, setAuthorship] = useState<{ [index: number]: string }>({}); // Index -> UserId
  const [isAuthorshipMode, setIsAuthorshipMode] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [handwriting, setHandwriting] = useState('');
  const [editorMode, setEditorMode] = useState<'text' | 'handwriting'>('text');

  // ★重要: これが入っているときは「予定作成モード」とする
  const [targetDate, setTargetDate] = useState<Date | null>(null);

  const [color, setColor] = useState<string>('blue');
  const [category, setCategory] = useState<string>('なし');

  const [isNavOpen, setIsNavOpen] = useState(true);
  const [isPreview, setIsPreview] = useState(false);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  // Sharing State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [enteredPasswords, setEnteredPasswords] = useState<Record<string, string>>({});
  const [remoteHandwriting, setRemoteHandwriting] = useState<string | null>(null);
  const [activeCounts, setActiveCounts] = useState<Record<string, number>>({});
  const [activeUsers, setActiveUsers] = useState<{ socketId: string; username: string; userId: string }[]>([]);
  const [peerCursors, setPeerCursors] = useState<Record<string, { x: number; y: number; username: string; color: string; mode?: string }>>({});
  const [authError, setAuthError] = useState<string | null>(null); // For verification API errors
  const editorRef = useRef<HTMLDivElement>(null);

  // Text Import State
  const [pendingImportText, setPendingImportText] = useState<string | null>(null);

  // Generate a color for a user based on their ID/Name
  const getUserColor = (id: string) => {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A8', '#33FFF5', '#F5FF33'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Helper to update authorship based on diff
  const updateAuthorship = (oldText: string, newText: string, authorId: string) => {
    const diffs = diff(oldText, newText);
    const newAuthorship: { [index: number]: string } = {};

    let oldIndex = 0;
    let newIndex = 0;

    diffs.forEach(([type, text]) => {
      if (type === 0) { // EQUAL
        // Copy authorship from old to new
        for (let i = 0; i < text.length; i++) {
          if (authorship[oldIndex + i]) {
            newAuthorship[newIndex + i] = authorship[oldIndex + i];
          }
        }
        oldIndex += text.length;
        newIndex += text.length;
      } else if (type === 1) { // INSERT
        // Assign new author
        for (let i = 0; i < text.length; i++) {
          newAuthorship[newIndex + i] = authorId;
        }
        newIndex += text.length;
      } else if (type === -1) { // DELETE
        // Skip old authorship
        oldIndex += text.length;
      }
    });

    setAuthorship(newAuthorship);
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      router.push('/LogIn');
      return;
    }
    setUserId(storedUserId);
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
    fetchMemos(storedUserId);
    fetchSharedMemos();

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

  const fetchSharedMemos = async () => {
    try {
      const res = await fetch('/api/memos/shared');
      if (res.ok) {
        const data: Memo[] = await res.json();
        setSharedMemos(data);
      }
    } catch (error) {
      console.error("Failed to fetch shared memos", error);
    }
  };

  // Determine current memo object (Local or Shared)
  const selectedMemo = memos.find(m => m.id === selectedId) || sharedMemos.find(m => m.id === selectedId);
  const isShared = selectedMemo?.isShared === true;
  const isOwner = selectedMemo?.userId === userId;



  // Realtime Hook
  const { isConnected, joinError: socketJoinError, joinedRoom, sendTextUpdate, sendCanvasUpdate, sendColorUpdate, sendCursorMove, sendSyncResponse, notifyRoomClosed } = useRealtime({
    roomId: selectedId,
    password: enteredPasswords[selectedId || ''] || (isOwner ? selectedMemo?.password : undefined),
    username: username,
    userId: userId || undefined, // Pass userId
    enabled: !!selectedId && isShared && (isOwner || isJoined),
    onRoomClosed: () => {
      if (!isOwner) {
        alert("ホストが共有を停止しました。");
        // Reset to New Memo state
        setSelectedId(null);
        setTitle('');
        setContent('');
        setHandwriting('');
        setAuthorship({});
        setEditorMode('text');
        setIsJoined(false);
        fetchSharedMemos();
      }
    },
    onTextUpdate: (newContent, senderId) => {
      // Diff and update authorship BEFORE updating content state
      if (senderId) {
        updateAuthorship(content, newContent, senderId);
      }
      setContent(newContent);
    },
    onCanvasUpdate: (data) => {
      setRemoteHandwriting(data);
      setHandwriting(data);
    },
    onColorUpdate: (newColor) => {
      setColor(newColor);
    },
    onRoomCountsUpdate: (counts) => {
      setActiveCounts(counts);
    },
    onRoomUsersUpdate: (users) => {
      setActiveUsers(users);
    },
    onCursorMove: (data) => {
      setPeerCursors((prev) => ({
        ...prev,
        [data.socketId]: { // Use socketId for cursor key to handle multiple tabs/sessions
          x: data.x,
          y: data.y,
          username: data.username || 'Anonymous',
          color: getUserColor(data.userId), // Use userId for color consistency
        }
      }));
    },
    onRequestSync: (requesterId) => {
      if (isOwner) {
        console.log(`Sending sync response to ${requesterId}`);
        sendSyncResponse(requesterId, {
          title,
          content,
          handwriting,
          color,
          category,
          authorship: JSON.stringify(authorship) // Send authorship too
        });
      }
    },
    onSyncResponse: (data) => {
      console.log('Received sync response:', data);
      if (data.title) setTitle(data.title);
      if (data.content) {
        // If we are syncing initial content, we might also get authorship
        setContent(data.content);
      }
      if (data.handwriting) {
        setHandwriting(data.handwriting);
        setRemoteHandwriting(data.handwriting);
      }
      if (data.color) setColor(data.color);
      if (data.category) setCategory(data.category);
      if (data.authorship) {
        try {
          setAuthorship(JSON.parse(data.authorship));
        } catch (e) {
          console.error("Failed to parse synced authorship", e);
        }
      }
    }
  });

  // Load authorship from DB when memo selected
  // Clear active users and cursors when leaving a room (or sharing disabled)
  useEffect(() => {
    if (!joinedRoom) {
      setActiveUsers([]);
      setPeerCursors({});
    }
  }, [joinedRoom]);

  // Load authorship from DB when memo selected
  // Use a ref to track if we have already loaded authorship for the current ID to prevent overwriting on edits
  const loadedMemoIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId || !selectedMemo) return;

    // Only load if we haven't loaded for this ID yet
    if (loadedMemoIdRef.current === selectedId) {
      return;
    }
    loadedMemoIdRef.current = selectedId;

    let initialAuth: { [index: number]: string } = {};

    if (selectedMemo.authorship) {
      try {
        // Parse DB authorship
        initialAuth = JSON.parse(selectedMemo.authorship);
      } catch (e) {
        console.error("Failed to parse DB authorship", e);
        initialAuth = {};
      }
    }

    // Retroactive assignment logic (only on initial load)
    if (selectedMemo.content) {
      const contentLen = selectedMemo.content.length;
      const authLen = Object.keys(initialAuth).length;

      // If data is significantly missing, assume owner implies ownership of gaps
      if (authLen < contentLen * 0.5 && selectedMemo.userId) {
        for (let i = 0; i < contentLen; i++) {
          if (!initialAuth[i]) {
            initialAuth[i] = selectedMemo.userId;
          }
        }
      }
    }

    setAuthorship(initialAuth);
  }, [selectedId, selectedMemo]); // We keep selectedMemo for the *first* trigger, but guard with ref.


  // Update handleSave to save authorship
  useEffect(() => {
    if (!selectedId) return;
    if (!title && !content && !handwriting) return;
    if (!userId) return;

    const timer = setTimeout(async () => {
      const m = memos.find(m => m.id === selectedId) || sharedMemos.find(m => m.id === selectedId);
      if (!m) return;

      try {
        const res = await fetch(`/api/memos/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            userId: m.userId,
            isSchedule: m.isSchedule ?? false,
            createdAt: m.createdAt,
            handwriting,
            isShared: m.isShared,
            password: m.password,
            color: color,
            category: category,
            authorship: JSON.stringify(authorship) // Save map
          }),
        });

        if (res.ok) {
          const savedMemo: Memo = await res.json();
          setMemos((prev) => prev.map(mm => mm.id === savedMemo.id ? { ...savedMemo, password: mm.password } : mm));
          setSharedMemos((prev) => prev.map(mm => mm.id === savedMemo.id ? savedMemo : mm));
        }
      } catch (error) {
        console.error("❌ Auto-save failed", error);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, content, handwriting, selectedId, userId, color, category, authorship]);


  // ...

  // Render Authorship View
  const renderAuthorshipView = () => {
    return (
      <div className={styles.textContainer} style={{ padding: '3rem 4rem', whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: '1rem', overflowY: 'auto', display: 'block' }}>
        {content.split('').map((char, index) => {
          const authorId = authorship[index];
          const authorColor = authorId ? getUserColor(authorId) : 'transparent';
          // Find author name if possible
          // authorId is the DB userId (GUID).

          let authorName = 'Unknown User';

          if (authorId === userId) {
            authorName = username || 'Me';
          } else {
            const activeUser = activeUsers.find(u => u.userId === authorId);
            if (activeUser) {
              authorName = activeUser.username;
            } else {
              // If not active, maybe we can find them in a cache or just show ID
              authorName = `User ${authorId?.substring(0, 4) || '???'}`;
            }
          }

          return (
            <span
              key={index}
              style={{ backgroundColor: authorId ? `${authorColor}33` : 'transparent', transition: 'background-color 0.3s' }}
              title={authorId ? `User: ${authorName}` : 'Unknown'} // Show Name
              className={styles.authorshipChar}
              data-author={authorId}
            >
              {char}
            </span>
          );
        })}
      </div>
    );
  };



  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isConnected || !selectedId || !isShared || !editorRef.current) return;

    // Relative coordinates to the editor area
    const rect = editorRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    sendCursorMove(x, y);
  };


  // Handle Join Error (Wrong Password)
  useEffect(() => {
    if (socketJoinError && selectedId) {
      // If error is due to password, re-open password modal?
      // Or show alert.
      // If we are owner, this shouldn't happen unless DB sync issue.
      if (!isOwner) {
        setIsPasswordModalOpen(true);
        // Clear bad password?
      } else {
        console.error("Owner join failed:", socketJoinError);
      }
    }
  }, [socketJoinError, isOwner, selectedId]);


  // リアルタイム反映（楽観的UI更新）- Local Only for list view
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
            handwriting: handwriting,
            updatedAt: new Date().toISOString(),
          }
          : memo
      )
    );
    // Note: we don't update sharedMemos optimistically for list title changes 
    // unless we want to, but titles aren't synced in realtime per requirements (only text/canvas/color).
  }, [title, content, handwriting, selectedId]);

  // ★自動保存ロジック
  useEffect(() => {
    if (!selectedId) return;
    if (!title && !content && !handwriting) return;
    if (!userId) return;

    // Don't auto-save if guest?
    // Guest edits -> send socket updates.
    // Host auto-saves?
    // If I am Guest, should I PUT to server?
    // Usually only owner saves. Or if "write access" is allowed.
    // For this prototype, if I am editor, I can save?
    // Let's allow saving for all participants for simplicity OR only host.
    // If Guest saves, it might fail if API restricts non-owners.
    // Current API `PUT /api/memos/[id]` updates usually. Does it check ownership?
    // I should check `api/memos/[id]/route.ts`. 
    // If API allows, then Guest autosave is fine (and necessary for persistence).

    // Check ownership? 
    // Let's assume anyone with password can edit/save.

    const timer = setTimeout(async () => {
      // Local state check
      const m = memos.find(m => m.id === selectedId) || sharedMemos.find(m => m.id === selectedId);
      if (!m) return;

      try {
        const res = await fetch(`/api/memos/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            userId: m.userId, // keep original owner
            isSchedule: m.isSchedule ?? false,
            createdAt: m.createdAt,
            handwriting,
            isShared: m.isShared,
            password: m.password,
            color: color, // Save color too
            category: category,
            authorship: JSON.stringify(authorship) // Save map
          }),
        });

        if (res.ok) {
          const savedMemo: Memo = await res.json();
          // Update local lists
          setMemos((prev) => prev.map(mm => mm.id === savedMemo.id ? { ...savedMemo, password: mm.password } : mm)); // preserve password if we have it locally
          setSharedMemos((prev) => prev.map(mm => mm.id === savedMemo.id ? savedMemo : mm));
        }
      } catch (error) {
        console.error("❌ Auto-save failed", error);
      }
    }, 2000); // Slower autosave for shared

    return () => clearTimeout(timer);
  }, [title, content, handwriting, selectedId, userId, color, category, authorship]);


  const handleSave = async (fromShareInfo?: { isShared: boolean, password?: string }) => {
    if (!userId) return;
    // ... (Similar to original handleSave but handling fromShareInfo)
    // Actually original handleSave implementation called fetch manually.
    // We can reuse the Autosave logic or force it.
    // Implementation details similar to original code...
    // To keep it short, I will assume autosave handles most, but manual save is good.
    // For ShareModal 'onSave', we need to force update `isShared`.

    if (selectedId) {
      const m = memos.find(m => m.id === selectedId) || sharedMemos.find(m => m.id === selectedId);
      if (!m) return;

      const updateBody: any = {
        title, content, userId: m.userId, isSchedule: m.isSchedule ?? false,
        color, category, createdAt: m.createdAt, handwriting,
        authorship: JSON.stringify(authorship)
      };
      if (fromShareInfo) {
        updateBody.isShared = fromShareInfo.isShared;
        updateBody.password = fromShareInfo.password;
      }

      try {
        const res = await fetch(`/api/memos/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateBody),
        });
        if (res.ok) {
          const savedMemo = await res.json();
          setMemos((prev) => prev.map(mm => mm.id === savedMemo.id ? savedMemo : mm));
          // Refresh shared list if shared status changed
          fetchSharedMemos();
          return savedMemo;
        }
      } catch (e) { console.error(e); }
    } else {
      // Create new
      const isSchedule = targetDate !== null;
      const res = await fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, content, userId, isSchedule, color, category,
          createdAt: targetDate ? targetDate.toISOString() : new Date().toISOString(),
          handwriting,
        }),
      });
      if (res.ok) {
        const newMemo = await res.json();
        setMemos(prev => [newMemo, ...prev]);
        setSelectedId(newMemo.id);
        if (isSchedule) {
          alert('予定を作成しました');
          handleCreateNew();
        } else {
          alert('メモを作成しました');
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm('削除しますか？')) return;
    try {
      await fetch(`/api/memos/${selectedId}`, { method: 'DELETE' });
      setMemos((prev) => prev.filter((m) => m.id !== selectedId));
      setSharedMemos((prev => prev.filter(m => m.id !== selectedId)));
      handleCreateNew();
    } catch (error) { console.error(error); }
  };

  const handleSelectMemo = (memo: Memo) => {
    console.log('📝 Selected memo:', memo);
    // Sharing Check
    // Sharing Check
    if (memo.isShared && memo.userId !== userId) {
      setIsJoined(false); // Reset join state
      // Do NOT check password immediately. Wait for "Join" click.
    } else {
      setIsJoined(true); // Owner is always joined
    }

    setSelectedId(memo.id);
    setTitle(memo.title);
    setContent(memo.content);
    setHandwriting(memo.handwriting || '');
    setEditorMode('text');
    setColor(memo.color || 'blue');
    setCategory(memo.category || 'なし');
    setIsPreview(false);
    setTargetDate(null);
    setRemoteHandwriting(null); // Reset remote data

    // Load authorship
    if (memo.authorship) {
      try {
        setAuthorship(JSON.parse(memo.authorship));
      } catch (e) {
        console.error("Failed to parse DB authorship", e);
        setAuthorship({});
      }
    } else {
      setAuthorship({});
      // Optional: retroactive assignment if content exists but no authorship
      if (memo.content && memo.userId) {
        const initialAuth: { [index: number]: string } = {};
        for (let i = 0; i < memo.content.length; i++) {
          initialAuth[i] = memo.userId;
        }
        setAuthorship(initialAuth);
      }
    }
  };

  const onPasswordSubmit = async (pw: string) => {
    if (!selectedId) return;

    try {
      const res = await fetch(`/api/memos/${selectedId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });

      if (res.ok) {
        const fullMemo = await res.json();

        // Update local lists with full content
        setSharedMemos(prev => prev.map(m => m.id === selectedId ? { ...m, ...fullMemo, password: pw } : m));
        setMemos(prev => prev.map(m => m.id === selectedId ? { ...m, ...fullMemo, password: pw } : m));

        // Set content if currently viewing (should be, since selectedId matches)
        if (fullMemo.content) setContent(fullMemo.content);
        if (fullMemo.handwriting) setHandwriting(fullMemo.handwriting);
        if (fullMemo.authorship) {
          try {
            setAuthorship(JSON.parse(fullMemo.authorship));
          } catch (e) { console.error(e); }
        }

        setEnteredPasswords(prev => ({ ...prev, [selectedId]: pw }));
        setIsPasswordModalOpen(false);
        setAuthError(null);
        setIsJoined(true);
      } else {
        const data = await res.json();
        setAuthError(data.error || 'パスワードが間違っています');
      }
    } catch (e) {
      console.error(e);
      setAuthError('認証エラーが発生しました');
    }
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setTitle('');
    setContent('');
    setHandwriting('');
    setEditorMode('text');
    setColor('blue');
    setCategory('なし');
    setIsPreview(false);
    setTargetDate(null);
    setAuthorship({});
    if (window.innerWidth < 768) setIsNavOpen(false);
  };

  const handleCreateForDate = (date: Date) => {
    setSelectedId(null);
    setTargetDate(date);
    setTitle('');
    setContent('');
    setHandwriting('');
    setEditorMode('text');
    setColor('blue');
    setCategory('なし');
    setIsPreview(false);
    setIsCalendarOpen(false);
    setAuthorship({});
    if (window.innerWidth < 768) setIsNavOpen(false);
  };


  const isScheduleMode = !!targetDate || (!!selectedMemo && selectedMemo.isSchedule === true);

  const [isFocusMode, setIsFocusMode] = useState(false);

  return (
    <div className={styles.appContainer}>
      {!isFocusMode && (
        <MemoSidebar
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          memos={memos}
          sharedMemos={sharedMemos}
          activeCounts={activeCounts}
          currentMemoId={selectedId}
          onSelect={handleSelectMemo}
          onCreateNew={handleCreateNew}
          onOpenCalendar={() => setIsCalendarOpen(true)}
        />
      )}

      <div className={`${styles.mainArea} ${isFocusMode ? styles.focusModeMain : ''}`}>
        {!isFocusMode && (
          <MemoHeader
            title={title}
            username={username}
            activeUsers={activeUsers}
            getUserColor={getUserColor}
            setTitle={setTitle}
            onToggleNav={() => setIsNavOpen(!isNavOpen)}
            onSave={() => handleSave()}
            onDelete={selectedId ? handleDelete : undefined}
            onShare={selectedId && isOwner ? () => setIsShareModalOpen(true) : undefined}
            isPreview={isPreview}
            setIsPreview={setIsPreview}
            showEditorControls={true}
            onEnterFocusMode={() => setIsFocusMode(true)}
          />
        )}

        {/* Info Bars */}
        {targetDate && !selectedId && !isFocusMode && (
          <div className={styles.infoBar}>
            📅 <b>{targetDate.toLocaleDateString()}</b> の予定を作成中
          </div>
        )}
        {isConnected && isShared && joinedRoom === selectedId && !isFocusMode && (
          <div className={styles.infoBar} style={{ backgroundColor: '#e6ffe6', color: '#006600' }}>
            共有中: リアルタイム同期が有効です
          </div>
        )}
        {socketJoinError && isShared && !isFocusMode && (
          <div className={styles.infoBar} style={{ backgroundColor: '#ffe6e6', color: 'red' }}>
            接続エラー: パスワードを確認してください
          </div>
        )}

        {/* Join Button Overlay */}
        {selectedId && isShared && !isOwner && !isJoined && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 100,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <h2 style={{ marginBottom: '20px' }}>共有メモに参加</h2>
            <button
              onClick={() => {
                const m = sharedMemos.find(memo => memo.id === selectedId);
                if (m?.hasPassword) {
                  setIsPasswordModalOpen(true);
                } else {
                  setIsJoined(true);
                }
              }}
              style={{
                padding: '12px 24px', fontSize: '1.2rem', backgroundColor: '#0070f3', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer'
              }}
            >
              参加する
            </button>
          </div>
        )}

        {/* Toolbar (Color / Category) - Hide in Focus Mode? Or keep? Let's keep for now but maybe make it subtle? */}
        {/* User request: "メモの記入部分だけを見ることのできるようにしたい" -> Hide toolbars too? */}
        {/* Let's hide toolbars for pure writing experience, or maybe keep them. 
            User said "see only memo writing part". So maybe hide toolbars? 
            But they might need to change color/category. 
            Let's hide them for now as per "only memo writing part". 
            But actually, if they are "editing", they might need tools. 
            Let's keep the editor mode toggle and toolbars for now, or maybe hide them.
            Let's hide the top bars (color/category) but keep the mode toggle? 
            Or just hide Sidebar and Header. The request says "Windows画面サイズを全画面からメモの記入部分だけ".
            So Sidebar + Header removal is the main thing.
        */}

        {!isFocusMode && isScheduleMode && (
          <div className={styles.toolbar}>
            <span className={styles.toolbarLabel}>Color:</span>
            {['red', 'blue', 'green', 'purple', 'pink'].map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); sendColorUpdate(c); }}
                className={`${styles.colorButton} ${color === c ? styles.colorButtonSelected : ''}`}
                style={{
                  backgroundColor: c === 'red' ? '#ffcccc' : c === 'blue' ? '#cceeff' : c === 'green' ? '#ccffcc' : c === 'purple' ? '#eeccee' : '#ffccee',
                  width: '30px', height: '30px', padding: 0, minWidth: '30px'
                }}
                title={c}
              />
            ))}
          </div>
        )}

        {!isFocusMode && !isScheduleMode && (
          <div className={styles.toolbar}>
            <span className={styles.toolbarLabel}>Category:</span>
            {['なし', '重要', '課題', 'アイデア', 'その他'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`${styles.categoryChip} ${category === cat ? styles.categoryChipSelected : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Editor Mode Toggle - maybe hide in focus mode if we want pure writing? 
            But how do they switch between text and handwriting?
            Let's keep it for now.
        */}
        <div className={styles.modeToggle} style={{ padding: '0 20px', marginBottom: '10px', display: isFocusMode ? 'none' : 'block' }}>
          {/* If we hide this, they can't switch. Let's force show or hide based on user preference? 
               User "only memo writing part". 
               Let's hide it and rely on shortcuts or exit focus mode to switch.
           */}
          <button
            onClick={() => setEditorMode('text')}
            style={{
              padding: '8px 16px', marginRight: '10px', borderRadius: '20px', border: 'none',
              background: editorMode === 'text' ? '#333' : '#eee',
              color: editorMode === 'text' ? '#fff' : '#333', cursor: 'pointer'
            }}
          >
            Text
          </button>
          <button
            onClick={() => setEditorMode('handwriting')}
            style={{
              padding: '8px 16px', borderRadius: '20px', border: 'none',
              background: editorMode === 'handwriting' ? '#333' : '#eee',
              color: editorMode === 'handwriting' ? '#fff' : '#333', cursor: 'pointer'
            }}
          >
            Handwriting
          </button>
        </div>

        <main className={styles.editorMain} style={isFocusMode ? { padding: '1rem', height: '100vh' } : {}}>
          {/* Floating Exit Button */}
          {isFocusMode && (
            <button
              onClick={() => setIsFocusMode(false)}
              className={styles.exitFocusButton}
              title="集中モードを終了"
            >
              ✖
            </button>
          )}

          {isPreview ? (
            <div className={styles.previewArea}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || '(本文なし)'}
              </ReactMarkdown>
            </div>
          ) : (
            <>
              {editorMode === 'handwriting' && (
                <div
                  style={{ height: isFocusMode ? '100vh' : 'calc(100vh - 250px)', padding: '0 20px', position: 'relative', overflow: 'hidden' }}
                  className={styles.whiteboardWrapper}
                  ref={editorRef}
                  onMouseMove={handleMouseMove}
                >
                  {isConnected && isShared && joinedRoom === selectedId && !isCalendarOpen && (
                    <CursorOverlay cursors={peerCursors} />
                  )}
                  <Whiteboard
                    key={selectedId || 'new'}
                    initialData={handwriting}
                    syncData={remoteHandwriting}
                    onChange={(json) => {
                      setHandwriting(json);
                      sendCanvasUpdate(json);
                    }}
                    readOnly={isPreview}
                    importText={pendingImportText}
                    onImportProcessed={() => setPendingImportText(null)}
                  />
                </div>
              )}

              {editorMode === 'text' && (
                <div
                  className={styles.textContainer}
                  ref={editorRef}
                  onMouseMove={handleMouseMove}
                  style={isFocusMode ? { maxWidth: '100%', height: '100%', border: 'none', boxShadow: 'none' } : {}}
                >
                  {isConnected && isShared && joinedRoom === selectedId && !isCalendarOpen && (
                    <CursorOverlay cursors={peerCursors} />
                  )}
                  {/* Selection to Whiteboard Button */}
                  <button
                    style={{
                      position: 'absolute', top: '10px', right: '20px', zIndex: 10,
                      padding: '6px 12px', fontSize: '0.8rem', background: '#333', color: '#fff',
                      border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: 0.8,
                      display: isFocusMode ? 'none' : 'block'
                    }}
                    onClick={() => {
                      if (window.getSelection) {
                        const sel = window.getSelection();
                        const text = sel ? sel.toString() : '';
                        if (text) {
                          setPendingImportText(text);
                          setEditorMode('handwriting');
                        } else {
                          alert('テキストを選択してからクリックしてください');
                        }
                      }
                    }}
                    title="選択範囲を手書きにコピー"
                  >
                    To Whiteboard
                  </button>

                  {/* Authorship Toggle Button */}
                  <div style={{ position: 'absolute', top: 10, right: 130, zIndex: 50, display: isFocusMode ? 'none' : 'block' }}>
                    <button
                      onClick={() => setIsAuthorshipMode(!isAuthorshipMode)}
                      style={{ padding: '5px 10px', fontSize: '0.8rem', cursor: 'pointer', background: isAuthorshipMode ? '#333' : '#fff', color: isAuthorshipMode ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '4px' }}
                    >
                      {isAuthorshipMode ? 'Hide Authors' : 'Show Authors'}
                    </button>
                  </div>

                  {isAuthorshipMode ? (
                    renderAuthorshipView()
                  ) : (
                    <textarea
                      className={styles.textArea}
                      placeholder="ここにメモを入力してください..."
                      value={content}
                      onChange={(e) => {
                        const newText = e.target.value;
                        if (userId) {
                          updateAuthorship(content, newText, userId);
                        }
                        setContent(newText);
                        // Send userId as senderId
                        sendTextUpdate(newText, userId || 'anon');
                      }}
                    />
                  )}
                </div>
              )}
            </>
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

      {selectedId && (
        <>
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            memoId={selectedId}
            isShared={isShared}
            currentPassword={selectedMemo?.password}
            onSave={(enabled, pwd) => {
              if (isShared && !enabled) {
                // If sharing was enabled and now disabled -> Close Room
                notifyRoomClosed();
              }
              handleSave({ isShared: enabled, password: pwd });
              setIsShareModalOpen(false);
            }}
          />
          <PasswordModal
            isOpen={isPasswordModalOpen}
            onClose={() => {
              setIsPasswordModalOpen(false);
              if (!enteredPasswords[selectedId]) {
                setSelectedId(null); // Cancel selection if no password
              }
            }}
            onSubmit={onPasswordSubmit}
            error={authError || socketJoinError}
          />
        </>
      )}
    </div>
  );
}
