'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import styles from './Whiteboard.module.css';

interface WhiteboardProps {
    initialData?: string | null;
    onChange?: (json: string) => void;
    readOnly?: boolean;
    syncData?: string | null;
    importText?: string | null;
    onImportProcessed?: () => void;
}

export default function Whiteboard({ initialData, onChange, readOnly = false, syncData, importText, onImportProcessed }: WhiteboardProps) {
    const canvasEl = useRef<HTMLCanvasElement>(null);
    const canvasInstance = useRef<fabric.Canvas | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(!readOnly);
    const [color, setColor] = useState('#000000'); // Default black
    const [isReady, setIsReady] = useState(false);

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
            brush.color = color;
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
            setIsReady(true);
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

    // 色変更（別のuseEffectで管理）
    useEffect(() => {
        if (canvasInstance.current) {
            const canvas = canvasInstance.current;
            if (canvas.freeDrawingBrush) {
                canvas.freeDrawingBrush.color = color;
            }
        }
    }, [color]);

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


    // テキストインポート処理
    useEffect(() => {
        if (!importText || !canvasInstance.current || !isReady) return;

        const canvas = canvasInstance.current;
        const textObj = new fabric.IText(importText, {
            left: canvas.width ? canvas.width / 2 : 100,
            top: canvas.height ? canvas.height / 2 : 100,
            originX: 'center',
            originY: 'center',
            fontSize: 20,
            fill: color,
        });

        canvas.add(textObj);
        canvas.setActiveObject(textObj);
        canvas.renderAll();

        // テキスト追加時は即座に編集できるように移動モード（選択モード）にする
        setIsDrawing(false);

        // 変更通知
        if (onChange) onChange(JSON.stringify(canvas.toJSON()));

        // 処理完了通知
        if (onImportProcessed) onImportProcessed();

    }, [importText, color, isReady]); // colorを含めると色が変わるたびに再追加される恐れがあるが、importTextがnullに戻れば問題ない。ただ、依存配列はimportTextだけが良いかも？
    // しかし、追加時の色を現在の色にしたいならcolorも必要。onImportProcessedでimportTextがnullになるはずなので大丈夫。
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
                    <div className={styles.separator} />
                    {['#000000', '#FF0000', '#0000FF', '#FFEB3B'].map((c) => (
                        <div
                            key={c}
                            className={`${styles.colorButton} ${color === c ? styles.activeColor : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => {
                                setColor(c);
                                setIsDrawing(true); // Switch to pen when color is picked
                            }}
                            title={c === '#000000' ? 'Black' : c === '#FF0000' ? 'Red' : c === '#0000FF' ? 'Blue' : 'Yellow'}
                        />
                    ))}
                    <div className={styles.separator} />
                    <button className={styles.toolButton} onClick={clearCanvas}>🗑️ 消去</button>
                </div>
            )}
            <canvas ref={canvasEl} className={styles.canvas} />
        </div>
    );
}