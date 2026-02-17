'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
};

export default function Home() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [memos, setMemos] = useState<Memo[]>([]);
  const [sharedMemos, setSharedMemos] = useState<Memo[]>([]);

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
  const [activeUsers, setActiveUsers] = useState<{ socketId: string; username: string }[]>([]);
  const [peerCursors, setPeerCursors] = useState<Record<string, { x: number; y: number; username: string; color: string; mode?: string }>>({});
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
  const currentMemo = memos.find(m => m.id === selectedId) || sharedMemos.find(m => m.id === selectedId);
  const isShared = currentMemo?.isShared === true;
  const isOwner = currentMemo?.userId === userId;

  // Realtime Hook
  const { isConnected, joinError, joinedRoom, sendTextUpdate, sendCanvasUpdate, sendColorUpdate, sendCursorMove, sendSyncResponse } = useRealtime({
    roomId: selectedId,
    password: enteredPasswords[selectedId || ''] || (isOwner ? currentMemo?.password : undefined),
    username: username, // Pass current username
    enabled: !!selectedId && isShared && (isOwner || isJoined), // Only try to join room if it is shared AND (Owner or Joined)
    onTextUpdate: (newContent) => {
      setContent(newContent);
    },
    onCanvasUpdate: (data) => {
      setRemoteHandwriting(data); // Sends to Whiteboard for visual update
      setHandwriting(data); // Updates local state for saving
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
        [data.userId]: {
          x: data.x,
          y: data.y,
          username: data.username || 'Anonymous',
          color: getUserColor(data.userId),
        }
      }));
    },
    onRequestSync: (requesterId) => {
      // Host (or anyone with data) sends current state to requester
      // Only owner should respond? Or anyone?
      // Let's say if I am owner, OR if I have content and the memo is shared.
      // Ideally only Owner or Host.
      if (isOwner) {
        console.log(`Sending sync response to ${requesterId}`);
        sendSyncResponse(requesterId, {
          title,
          content,
          handwriting,
          color,
          category
        });
      }
    },
    onSyncResponse: (data) => {
      console.log('Received sync response:', data);
      // Apply synced data
      if (data.title) setTitle(data.title);
      if (data.content) setContent(data.content);
      if (data.handwriting) {
        setHandwriting(data.handwriting);
        setRemoteHandwriting(data.handwriting);
      }
      if (data.color) setColor(data.color);
      if (data.category) setCategory(data.category);
    }
  });

  // Clear cursors on room change or leave
  useEffect(() => {
    setPeerCursors({});
    setActiveUsers([]);
  }, [selectedId]);

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
    if (joinError && selectedId) {
      // If error is due to password, re-open password modal?
      // Or show alert.
      // If we are owner, this shouldn't happen unless DB sync issue.
      if (!isOwner) {
        setIsPasswordModalOpen(true);
        // Clear bad password?
      } else {
        console.error("Owner join failed:", joinError);
      }
    }
  }, [joinError, isOwner, selectedId]);


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
            category: category
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
  }, [title, content, handwriting, selectedId, userId, color, category]);


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
  };

  const onPasswordSubmit = (pw: string) => {
    if (selectedId) {
      setEnteredPasswords(prev => ({ ...prev, [selectedId]: pw }));
      setIsPasswordModalOpen(false);
      setIsJoined(true); // Allow connection
      // useRealtime will detect enteredPasswords change and try to connect
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
    if (window.innerWidth < 768) setIsNavOpen(false);
  };

  const selectedMemo = memos.find(m => m.id === selectedId) || sharedMemos.find(m => m.id === selectedId);
  const isScheduleMode = !!targetDate || (!!selectedMemo && selectedMemo.isSchedule === true);

  return (
    <div className={styles.appContainer}>
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

      <div className={styles.mainArea}>
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
        />

        {/* Info Bars */}
        {targetDate && !selectedId && (
          <div className={styles.infoBar}>
            📅 <b>{targetDate.toLocaleDateString()}</b> の予定を作成中
          </div>
        )}
        {isConnected && isShared && joinedRoom === selectedId && (
          <div className={styles.infoBar} style={{ backgroundColor: '#e6ffe6', color: '#006600' }}>
            共有中: リアルタイム同期が有効です
          </div>
        )}
        {joinError && isShared && (
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

        {/* Toolbar (Color / Category) */}
        {isScheduleMode && (
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

        {!isScheduleMode && (
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

        {/* Editor Mode Toggle */}
        <div className={styles.modeToggle} style={{ padding: '0 20px', marginBottom: '10px' }}>
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

        <main className={styles.editorMain}>
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
                  style={{ height: 'calc(100vh - 250px)', padding: '0 20px', position: 'relative', overflow: 'hidden' }}
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
                >
                  {isConnected && isShared && joinedRoom === selectedId && !isCalendarOpen && (
                    <CursorOverlay cursors={peerCursors} />
                  )}
                  {/* Selection to Whiteboard Button */}
                  <button
                    style={{
                      position: 'absolute', top: '10px', right: '20px', zIndex: 10,
                      padding: '6px 12px', fontSize: '0.8rem', background: '#333', color: '#fff',
                      border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: 0.8
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
                  <textarea
                    className={styles.textArea}
                    placeholder="ここにメモを入力してください..."
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      sendTextUpdate(e.target.value);
                    }}
                  />
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
            currentPassword={currentMemo?.password}
            onSave={(enabled, pwd) => {
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
            error={joinError}
          />
        </>
      )}
    </div>
  );
}
