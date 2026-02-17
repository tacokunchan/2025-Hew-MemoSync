import React from 'react';

type CursorProps = {
    x: number;
    y: number;
    username: string;
    color: string;
    mode?: string;
};

const Cursor = ({ x, y, username, color, mode }: CursorProps) => {
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `translate(${x}px, ${y}px)`,
                pointerEvents: 'none',
                zIndex: 9999,
                transition: 'transform 0.1s linear',
            }}
        >
            <div
                style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: '2px solid white',
                    boxShadow: '0 0 4px rgba(0,0,0,0.3)',
                    transform: 'translate(-50%, -50%)', // Center the circle on coordinate
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    backgroundColor: color,
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    opacity: 0.9,
                }}
            >
                {username}
            </div>
        </div>
    );
};

type Props = {
    cursors: Record<string, { x: number; y: number; username: string; color: string; mode?: string }>;
};

const CursorOverlay = ({ cursors }: Props) => {
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'hidden',
                zIndex: 9998,
            }}
        >
            {Object.entries(cursors).map(([userId, cursor]) => (
                <Cursor key={userId} {...cursor} />
            ))}
        </div>
    );
};

export default CursorOverlay;
