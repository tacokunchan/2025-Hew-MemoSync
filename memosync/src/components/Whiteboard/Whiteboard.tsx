'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import styles from './Whiteboard.module.css';

interface WhiteboardProps {
    initialData?: string | null;
    onChange?: (json: string) => void;
    readOnly?: boolean;
    syncData?: string | null;
}

export default function Whiteboard({ initialData, onChange, readOnly = false, syncData }: WhiteboardProps) {
    const canvasEl = useRef<HTMLCanvasElement>(null);
    const canvasInstance = useRef<fabric.Canvas | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(!readOnly);

    useEffect(() => {
        // 1. 基本チェック
        if (!canvasEl.current || !containerRef.current) return;

        let isMounted = true; // このEffectが有効かどうかのフラグ

        // 2. 既存のインスタンスを徹底的に掃除
        const cleanupExistingCanvas = async () => {
            if (canvasInstance.current) {
                const oldCanvas = canvasInstance.current;
                canvasInstance.current = null;
                await oldCanvas.dispose();
            }
        };

        const initCanvas = async () => {
            await cleanupExistingCanvas();

            // cleanup中にアンマウントされたら中断
            if (!isMounted || !canvasEl.current || !containerRef.current) return;

            const { width, height } = containerRef.current.getBoundingClientRect();

            const canvas = new fabric.Canvas(canvasEl.current, {
                isDrawingMode: !readOnly,
                width: width || 800,
                height: height || 400,
                backgroundColor: '#ffffff',
            });

            canvasInstance.current = canvas;

            // ペン設定
            const brush = new fabric.PencilBrush(canvas);
            brush.width = 3;
            canvas.freeDrawingBrush = brush;

            // データ読み込み
            if (initialData && initialData !== "{}" && initialData !== "null") {
                try {
                    const json = JSON.parse(initialData);
                    // loadFromJSONを実行し、終わった時にまだ自分が最新のインスタンスか確認
                    await canvas.loadFromJSON(json);

                    if (isMounted && canvasInstance.current === canvas) {
                        canvas.renderAll();
                    }
                } catch (e) {
                    console.error("Fabric Load Error:", e);
                }
            }

            // イベントリスナー
            const handleChange = () => {
                if (isMounted && canvasInstance.current === canvas && onChange) {
                    onChange(JSON.stringify(canvas.toJSON()));
                }
            };

            canvas.on('path:created', handleChange);
            canvas.on('object:modified', handleChange);
        };

        initCanvas();

        // リサイズ処理
        const resizeObserver = new ResizeObserver((entries) => {
            if (!isMounted || !canvasInstance.current || !entries[0]) return;
            const { width, height } = entries[0].contentRect;

            // getContextの存在を直接確認
            const currentCanvas = canvasInstance.current;
            if (currentCanvas && currentCanvas.getContext()) {
                currentCanvas.setDimensions({ width, height });
                currentCanvas.renderAll();
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            isMounted = false;
            resizeObserver.disconnect();
            if (canvasInstance.current) {
                const canvasToDispose = canvasInstance.current;
                canvasInstance.current = null;
                canvasToDispose.dispose();
            }
        };
    }, []); // 依存配列を空にして初期化の連鎖を防ぐ

    // モード切替（別のuseEffectで管理）
    useEffect(() => {
        if (canvasInstance.current) {
            canvasInstance.current.isDrawingMode = isDrawing && !readOnly;
        }
    }, [isDrawing, readOnly]);

    // リモートからのデータ同期
    useEffect(() => {
        if (!syncData || !canvasInstance.current) return;

        const applySync = async () => {
            const canvas = canvasInstance.current;
            if (!canvas) return;

            try {
                // If the user is currently drawing, maybe we should pause sync or just apply?
                // Applying might disrupt the stroke. 
                // However, since we receive updates after "path:created" from others, it should be fine.
                // But strict equality check is good to avoid redundant renders.
                const currentJson = JSON.stringify(canvas.toJSON());
                if (currentJson === syncData) return;

                await canvas.loadFromJSON(JSON.parse(syncData));
                canvas.renderAll();
            } catch (e) {
                console.error("Sync Error:", e);
            }
        };
        applySync();
    }, [syncData]);

    const clearCanvas = () => {
        const canvas = canvasInstance.current;
        if (canvas && !readOnly && canvas.getContext()) {
            canvas.clear();
            canvas.backgroundColor = '#ffffff';
            canvas.renderAll();
            if (onChange) onChange(JSON.stringify(canvas.toJSON()));
        }
    };

    return (
        <div className={styles.container} ref={containerRef}>
            {!readOnly && (
                <div className={styles.toolbar}>
                    <button className={`${styles.toolButton} ${isDrawing ? styles.active : ''}`} onClick={() => setIsDrawing(true)}>🖊️ ペン</button>
                    <button className={`${styles.toolButton} ${!isDrawing ? styles.active : ''}`} onClick={() => setIsDrawing(false)}>✋ 移動</button>
                    <button className={styles.toolButton} onClick={clearCanvas}>🗑️ 消去</button>
                </div>
            )}
            <canvas ref={canvasEl} className={styles.canvas} />
        </div>
    );
}