import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

type RealtimeOptions = {
    roomId: string | null;
    password?: string;
    enabled: boolean;
    onTextUpdate?: (content: string) => void;
    onCanvasUpdate?: (data: string) => void;
    onColorUpdate?: (color: string) => void;
    onRoomCountsUpdate?: (counts: Record<string, number>) => void;
};

export const useRealtime = ({
    roomId,
    password,
    enabled,
    onTextUpdate,
    onCanvasUpdate,
    onColorUpdate,
    onRoomCountsUpdate,
}: RealtimeOptions) => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [joinedRoom, setJoinedRoom] = useState<string | null>(null);

    // Keep latest callbacks in ref to avoid re-binding listeners
    const callbacksRef = useRef({ onTextUpdate, onCanvasUpdate, onColorUpdate, onRoomCountsUpdate });

    useEffect(() => {
        callbacksRef.current = { onTextUpdate, onCanvasUpdate, onColorUpdate, onRoomCountsUpdate };
    }, [onTextUpdate, onCanvasUpdate, onColorUpdate, onRoomCountsUpdate]);

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
            // Note: If password changed, we might want to re-emit join-request too? 
            // For now, assume if roomId matches joinedRoom, we are good.
            // But if we failed before (joinError), we should retry if password changed.

            const shouldJoin = joinedRoom !== roomId || (joinError && password);

            if (shouldJoin) {
                console.log(`Requesting join for room: ${roomId}`);
                socket.emit('join-request', { roomId, password });
            }
        }
    }, [roomId, password, enabled, isConnected, joinedRoom, joinError]);


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

    return {
        isConnected,
        joinError,
        joinedRoom,
        sendTextUpdate,
        sendCanvasUpdate,
        sendColorUpdate,
    };
};
