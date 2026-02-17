'use client';

import React from 'react';
import styles from './MemoHeader.module.css';

type Props = {
  title?: string;
  setTitle?: (value: string) => void;
  onToggleNav: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  isPreview?: boolean;
  setIsPreview?: (value: boolean) => void;
  showEditorControls?: boolean;
  username?: string;
  activeUsers?: { socketId: string; username: string }[];
  getUserColor?: (id: string) => string;
};

export default function MemoHeader({
  title = '',
  setTitle,
  onToggleNav,
  onSave,
  onDelete,
  onShare,
  isPreview = false,
  setIsPreview,
  showEditorControls = true,
  username,
  activeUsers = [],
  getUserColor,
}: Props) {
  const [isUsersDropdownOpen, setIsUsersDropdownOpen] = React.useState(false);

  return (
    <header className={styles.header}>
      {/* 左側：ハンバーガーボタン */}
      <div className={styles.leftGroup}>
        <button onClick={onToggleNav} className={styles.menuButton}>
          メニュー
        </button>
      </div>

      {/* 中央：タイトル入力 */}
      {showEditorControls && setTitle ? (
        <input
          type="text"
          placeholder="タイトルを入力"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.titleInput}
        />
      ) : (
        <h1 className={styles.appTitle}>マイメモ帳</h1>
      )}

      {/* 右側：アクションボタン */}
      {showEditorControls && (
        <div className={styles.actions}>
          {username && (
            <div style={{ position: 'relative', marginRight: '16px' }}>
              <button
                onClick={() => setIsUsersDropdownOpen(!isUsersDropdownOpen)}
                className={styles.username}
                style={{
                  paddingTop: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {username}
                {activeUsers.length > 0 && <span style={{ fontSize: '0.8em', opacity: 0.8 }}>({activeUsers.length} active)</span>}
                <span style={{ fontSize: '0.8em' }}>▼</span>
              </button>

              {isUsersDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  padding: '8px',
                  minWidth: '150px',
                  zIndex: 1000,
                  color: '#333'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>Active Users</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li style={{ padding: '4px 0', color: '#666' }}>{username} (You)</li>
                    {activeUsers.filter(u => u.username !== username).map((user) => (
                      <li key={user.socketId} style={{ padding: '4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getUserColor && (
                          <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: getUserColor(user.socketId),
                            display: 'inline-block'
                          }} />
                        )}
                        {user.username}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {onShare && (
            <button onClick={onShare} className={styles.previewButton} style={{ marginRight: '8px', backgroundColor: '#eebbbb' }}>
              共有
            </button>
          )}
          <button
            onClick={() => setIsPreview && setIsPreview(!isPreview)}
            className={styles.previewButton}
          >
            {isPreview ? '編集' : '確認'}
          </button>
          <button onClick={onSave} className={styles.saveButton}>
            保存
          </button>
          {onDelete && (
            <button onClick={onDelete} className={styles.deleteButton}>
              削除
            </button>
          )}
        </div>
      )}
    </header>
  );
}