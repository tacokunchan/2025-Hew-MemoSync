import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

type RealtimeOptions = {
    roomId: string | null;
    password?: string;
    username?: string; // Additional prop
    enabled: boolean;
    onTextUpdate?: (content: string) => void;
    onCanvasUpdate?: (data: string) => void;
    onColorUpdate?: (color: string) => void;
    onRoomCountsUpdate?: (counts: Record<string, number>) => void;
    onRoomUsersUpdate?: (users: { socketId: string, username: string }[]) => void; // New callback
    onCursorMove?: (data: { userId: string, username: string, x: number, y: number }) => void; // New callback
    onRequestSync?: (requesterId: string) => void;
    onSyncResponse?: (data: any) => void;
};

export const useRealtime = ({
    roomId,
    password,
    username,
    enabled,
    onTextUpdate,
    onCanvasUpdate,
    onColorUpdate,
    onRoomCountsUpdate,
    onRoomUsersUpdate,
    onCursorMove,
    onRequestSync,
    onSyncResponse,
}: RealtimeOptions) => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [joinedRoom, setJoinedRoom] = useState<string | null>(null);

    // Keep latest callbacks in ref to avoid re-binding listeners
    const callbacksRef = useRef({ onTextUpdate, onCanvasUpdate, onColorUpdate, onRoomCountsUpdate, onRoomUsersUpdate, onCursorMove, onRequestSync, onSyncResponse });

    useEffect(() => {
        callbacksRef.current = { onTextUpdate, onCanvasUpdate, onColorUpdate, onRoomCountsUpdate, onRoomUsersUpdate, onCursorMove, onRequestSync, onSyncResponse };
    }, [onTextUpdate, onCanvasUpdate, onColorUpdate, onRoomCountsUpdate, onRoomUsersUpdate, onCursorMove, onRequestSync, onSyncResponse]);

    // 1. Establish persistent connection
    useEffect(() => {
        // Only create socket if it doesn't exist
        if (!socketRef.current) {
            const socket = io({
                path: '/socket.io',
                reconnectionAttempts: 5,
                transports: ['websocket'], // Prefer websocket
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                console.log('Socket connected:', socket.id);
                setIsConnected(true);
                setJoinError(null);
            });

            socket.on('disconnect', () => {
                console.log('Socket disconnected');
                setIsConnected(false);
                setJoinedRoom(null);
            });

            socket.on('connect_error', (err) => {
                console.error('Socket connection error:', err);
            });

            // Global listeners
            socket.on('room-counts-update', (counts: Record<string, number>) => {
                callbacksRef.current.onRoomCountsUpdate?.(counts);
            });

            socket.on('room-users-update', (users: { socketId: string, username: string }[]) => {
                callbacksRef.current.onRoomUsersUpdate?.(users);
            });

            socket.on('join-success', (room) => {
                console.log('Joined room:', room);
                setJoinedRoom(room);
                setJoinError(null);
            });

            socket.on('join-failed', (msg) => {
                console.warn('Join failed:', msg);
                setJoinError(msg);
                setJoinedRoom(null);
            });

            socket.on('text-update', (data: { content: string }) => {
                callbacksRef.current.onTextUpdate?.(data.content);
            });

            socket.on('canvas-update', (data: { canvasData: string }) => {
                callbacksRef.current.onCanvasUpdate?.(data.canvasData);
            });

            socket.on('color-update', (data: { color: string }) => {
                callbacksRef.current.onColorUpdate?.(data.color);
            });

            socket.on('cursor-move', (data: { userId: string, username: string, x: number, y: number }) => {
                callbacksRef.current.onCursorMove?.(data);
            });

            socket.on('request-sync', (data: { requesterId: string }) => {
                callbacksRef.current.onRequestSync?.(data.requesterId);
            });

            socket.on('sync-response', (data: any) => {
                callbacksRef.current.onSyncResponse?.(data);
            });
        }

        // Clean up ONLY on unmount (component destroys)
        return () => {
            if (socketRef.current) {
                console.log('Cleaning up socket...');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    // 2. Handle Room Joining
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        // Only try to join if we are connected, enabled is true, and we have a roomId
        if (isConnected && enabled && roomId) {
            // Join if not already in this room
            // Re-join if username changed? Maybe not needed strictly, but good for updating server state if we re-join.
            // Simplified: If roomId or password or username changes while enabled, re-join.

            // Check if we are already in the correct room. 
            // If joinedRoom === roomId, we are good? 
            // But if username changed, we might want to update it. Server logic for 'update-user' isn't there, so re-join is easiest.

            const shouldJoin = joinedRoom !== roomId || (joinError && password);
            // Note: We don't auto-rejoin just for username change to avoid flicker, unless we want to.
            // Let's assume username is stable during a session usually.

            if (shouldJoin) {
                // If we were in another room, leave it first
                if (joinedRoom) {
                    console.log(`Leaving room: ${joinedRoom}`);
                    socket.emit('leave-room', joinedRoom);
                    setJoinedRoom(null);
                }

                console.log(`Requesting join for room: ${roomId} as ${username}`);
                socket.emit('join-request', { roomId, password, username });
            }
        } else {
            // If we disabled or no roomId, but we are in a room -> LEAVE
            if (joinedRoom && socket) {
                console.log(`Leaving room (disabled/changed): ${joinedRoom}`);
                socket.emit('leave-room', joinedRoom);
                setJoinedRoom(null);
            }
        }
    }, [roomId, password, username, enabled, isConnected, joinedRoom, joinError]);


    const sendTextUpdate = useCallback((content: string) => {
        if (socketRef.current && joinedRoom) {
            socketRef.current.emit('text-update', { roomId: joinedRoom, content });
        }
    }, [joinedRoom]);

    const sendCanvasUpdate = useCallback((canvasData: string) => {
        if (socketRef.current && joinedRoom) {
            socketRef.current.emit('canvas-update', { roomId: joinedRoom, canvasData });
        }
    }, [joinedRoom]);

    const sendColorUpdate = useCallback((color: string) => {
        if (socketRef.current && joinedRoom) {
            socketRef.current.emit('color-update', { roomId: joinedRoom, color });
        }
    }, [joinedRoom]);

    const sendCursorMove = useCallback((x: number, y: number) => {
        if (socketRef.current && joinedRoom) {
            // Throttle? For now, raw.
            socketRef.current.emit('cursor-move', { roomId: joinedRoom, x, y });
        }
    }, [joinedRoom]);

    const sendSyncResponse = useCallback((targetId: string, data: any) => {
        if (socketRef.current) {
            socketRef.current.emit('sync-response', { targetId, ...data });
        }
    }, []);

    const requestSync = useCallback(() => {
        if (socketRef.current && joinedRoom) {
            socketRef.current.emit('request-sync', joinedRoom);
        }
    }, [joinedRoom]);

    // Auto-request sync when room is joined
    useEffect(() => {
        if (joinedRoom) {
            requestSync();
        }
    }, [joinedRoom, requestSync]);

    return {
        isConnected,
        joinError,
        joinedRoom,
        sendTextUpdate,
        sendCanvasUpdate,
        sendColorUpdate,
        sendCursorMove,
        sendSyncResponse,
        requestSync,
    };
};
