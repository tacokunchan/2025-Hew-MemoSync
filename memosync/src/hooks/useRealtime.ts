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
    onRequestSync?: (requesterId: string) => void;
    onSyncResponse?: (data: any) => void;
};

export const useRealtime = ({
    roomId,
    password,
    enabled,
    onTextUpdate,
    onCanvasUpdate,
    onColorUpdate,
    onRoomCountsUpdate,
    onRequestSync,
    onSyncResponse,
}: RealtimeOptions) => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [joinedRoom, setJoinedRoom] = useState<string | null>(null);

    // Keep latest callbacks in ref to avoid re-binding listeners
    const callbacksRef = useRef({ onTextUpdate, onCanvasUpdate, onColorUpdate, onRoomCountsUpdate, onRequestSync, onSyncResponse });

    useEffect(() => {
        callbacksRef.current = { onTextUpdate, onCanvasUpdate, onColorUpdate, onRoomCountsUpdate, onRequestSync, onSyncResponse };
    }, [onTextUpdate, onCanvasUpdate, onColorUpdate, onRoomCountsUpdate, onRequestSync, onSyncResponse]);

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
            const shouldJoin = joinedRoom !== roomId || (joinError && password);

            if (shouldJoin) {
                // If we were in another room, leave it first
                if (joinedRoom) {
                    console.log(`Leaving room: ${joinedRoom}`);
                    socket.emit('leave-room', joinedRoom);
                    setJoinedRoom(null);
                }

                console.log(`Requesting join for room: ${roomId}`);
                socket.emit('join-request', { roomId, password });
            }
        } else {
            // If we disabled or no roomId, but we are in a room -> LEAVE
            if (joinedRoom && socket) {
                console.log(`Leaving room (disabled/changed): ${joinedRoom}`);
                socket.emit('leave-room', joinedRoom);
                setJoinedRoom(null);
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
        sendSyncResponse,
        requestSync,
    };
};
