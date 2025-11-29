"use client";

import React, { useState, useRef } from "react";
import Draggable from "react-draggable";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import styles from "./PhotoEditor.module.css";
import { LayoutType } from "./LayoutSelector";
import { X, Image as ImageIcon, Film, Minus, Plus } from "lucide-react";
import { FilterType } from "./Camera";

// ... imports

interface PhotoEditorProps {
    photos: string[][]; // Array of bursts
    layout: LayoutType;
    filter: FilterType;
    onReset: () => void;
}

const STICKERS = ["❤️", "⭐", "🎀", "😎", "🔥", "✨", "🐶", "🐱", "👑", "💋"];
const BORDER_COLORS = ["#ffffff", "#000000", "#ffb7b2", "#b5ead7", "#c7ceea", "#e2f0cb"];

const getLayoutClassName = (layout: LayoutType) => {
    switch (layout) {
        case "4-diagonal": return "layout4Diagonal";
        case "3-diagonal": return "layout3Diagonal";
        case "4-square": return "layout4Square";
        case "6-grid": return "layout6Grid";
        default: return "layout4Diagonal";
    }
};

const getFilterStyle = (f: FilterType) => {
    switch (f) {
        case "bw": return { filter: "grayscale(100%) contrast(1.2)" };
        case "soft": return { filter: "brightness(1.1) contrast(0.9) saturate(0.8) blur(0.5px)" };
        case "vintage": return { filter: "sepia(0.5) contrast(1.1) saturate(0.8)" };
        default: return {};
    }
};

// Sub-component to handle nodeRef logic cleanly
function DraggableSticker({ sticker, onRemove, onResize }: {
    sticker: { id: number; content: string; x: number; y: number; scale: number },
    onRemove: (id: number) => void,
    onResize: (id: number, delta: number) => void
}) {
    const nodeRef = useRef(null);
    return (
        <Draggable nodeRef={nodeRef} bounds={{ left: -100, top: -100, right: 400, bottom: 1000 }} defaultPosition={{ x: 0, y: 0 }}>
            <div ref={nodeRef} className={styles.sticker} style={{ position: 'absolute', zIndex: 10, cursor: 'move', transform: `scale(${sticker.scale})` }}>
                <div className={styles.stickerContent} style={{ transform: `scale(${sticker.scale})` }}>
                    {sticker.content}
                </div>
                <div className={styles.stickerControls}>
                    <button className={styles.controlBtn} onClick={(e) => { e.stopPropagation(); onResize(sticker.id, -0.1); }}>
                        <Minus size={8} />
                    </button>
                    <button className={styles.controlBtn} onClick={(e) => { e.stopPropagation(); onRemove(sticker.id); }}>
                        <X size={8} />
                    </button>
                    <button className={styles.controlBtn} onClick={(e) => { e.stopPropagation(); onResize(sticker.id, 0.1); }}>
                        <Plus size={8} />
                    </button>
                </div>
            </div>
        </Draggable>
    );
}

export default function PhotoEditor({ photos, layout, filter, onReset }: PhotoEditorProps) {
    console.log("PhotoEditor received photos:", photos.length, "bursts");
    if (photos.length > 0) {
        console.log("First burst length:", photos[0].length);
        console.log("First photo sample:", photos[0][0]?.substring(0, 30));
    }
    const [borderColor, setBorderColor] = useState("#ffffff");
    const [stickers, setStickers] = useState<{ id: number; content: string; x: number; y: number; scale: number }[]>([]);
    const stripRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    // State to control which frame of the burst is currently displayed
    // For editing, we usually show the last frame (the "final" shot)
    // But for GIF generation, we will programmatically cycle this.
    const [displayFrameIndex, setDisplayFrameIndex] = useState<number | null>(null); // null means show last frame

    const addSticker = (content: string) => {
        setStickers([...stickers, { id: Date.now(), content, x: 0, y: 0, scale: 1 }]);
    };

    const removeSticker = (id: number) => {
        setStickers(stickers.filter((s) => s.id !== id));
    };

    const resizeSticker = (id: number, delta: number) => {
        setStickers(stickers.map(s => {
            if (s.id === id) {
                const newScale = Math.max(0.5, Math.min(3, s.scale + delta));
                return { ...s, scale: newScale };
            }
            return s;
        }));
    };

    const downloadImage = async (format: "png" | "jpg") => {
        if (!stripRef.current) return;
        setIsExporting(true);
        // Ensure we are showing the static (last) frame
        setDisplayFrameIndex(null);

        // Wait for render
        await new Promise(r => setTimeout(r, 100));

        try {
            const canvas = await html2canvas(stripRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: null,
            });
            canvas.toBlob((blob) => {
                if (blob) saveAs(blob, `photobooth-${Date.now()}.${format}`);
            }, `image/${format === "jpg" ? "jpeg" : "png"}`);
        } catch (err) {
            console.error("Export failed", err);
        } finally {
            setIsExporting(false);
        }
    };

    const downloadGif = async () => {
        if (!stripRef.current) return;
        setIsExporting(true);

        try {
            const gifModule = await import("gif.js");
            const GIF = gifModule.default || gifModule;

            const gif = new GIF({
                workers: 2,
                quality: 10,
                width: 600, // We might need to adjust this based on actual canvas size
                height: 800,
                workerScript: '/gif.worker.js'
            });

            // Determine burst length (assuming all bursts are same length)
            const burstLength = photos[0]?.length || 1;
            console.log("GIF Generation: Burst length is", burstLength, "Total photos:", photos.length);

            // Cycle through each frame of the burst
            for (let i = 0; i < burstLength; i++) {
                // Update state to show the i-th frame of all photos
                setDisplayFrameIndex(i);

                // Wait for React to re-render the DOM with new images
                await new Promise(r => setTimeout(r, 200));

                // Capture the strip
                const canvas = await html2canvas(stripRef.current, {
                    useCORS: true,
                    scale: 1, // Keep scale manageable for GIF
                    backgroundColor: null,
                    logging: false
                });

                // Add to GIF
                gif.addFrame(canvas, { delay: 100 }); // 100ms per frame = 10fps
            }

            // Reset to static view
            setDisplayFrameIndex(null);

            gif.on('finished', (blob: Blob) => {
                saveAs(blob, `photobooth-motion-${Date.now()}.gif`);
                setIsExporting(false);
            });

            gif.render();

        } catch (err) {
            console.error("GIF export failed", err);
            setIsExporting(false);
            setDisplayFrameIndex(null);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.controlsSidebar}>
                <div className={styles.section}>
                    <h3>Border</h3>
                    <div className={styles.colorGrid}>
                        {BORDER_COLORS.map((c) => (
                            <button
                                key={c}
                                className={styles.colorBtn}
                                style={{ backgroundColor: c, border: c === borderColor ? "2px solid #333" : "1px solid #ddd" }}
                                onClick={() => setBorderColor(c)}
                            />
                        ))}
                    </div>
                </div>

                <div className={styles.section}>
                    <h3>Stickers</h3>
                    <div className={styles.stickerGrid}>
                        {STICKERS.map((s) => (
                            <button key={s} className={styles.stickerBtn} onClick={() => addSticker(s)}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.section}>
                    <h3>Actions</h3>
                    <button className="btn" onClick={onReset} style={{ width: '100%', marginBottom: '0.5rem' }}>Start Over</button>
                    <div className={styles.exportBtns}>
                        <button className="btn btn-primary" onClick={() => downloadImage("png")} disabled={isExporting}>
                            <ImageIcon size={16} /> PNG
                        </button>
                        <button className="btn btn-primary" onClick={() => downloadImage("jpg")} disabled={isExporting}>
                            <ImageIcon size={16} /> JPG
                        </button>
                        <button className="btn btn-primary" onClick={downloadGif} disabled={isExporting}>
                            <Film size={16} /> GIF
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.previewArea}>
                <div
                    ref={stripRef}
                    className={`${styles.photoStrip} ${styles[getLayoutClassName(layout)]}`}
                    style={{ backgroundColor: borderColor }}
                >
                    <div className={styles.header}>
                        <span className={styles.date}>{new Date().toLocaleDateString()}</span>
                        <span className={styles.brand}>PHOTOBOOTH</span>
                    </div>

                    <div className={styles.grid}>
                        {photos.map((burst, i) => {
                            // Determine which frame to show
                            // If displayFrameIndex is null, show the last frame (static)
                            // Else show the specific frame index (clamped to burst length)
                            const frameIndex = displayFrameIndex === null ? burst.length - 1 : Math.min(displayFrameIndex, burst.length - 1);
                            const src = burst[frameIndex];

                            return (
                                <div key={i} className={styles.photoFrame}>
                                    <img
                                        key={`${i}-${frameIndex}`} // Force re-render
                                        src={src}
                                        alt={`photo-${i}-${frameIndex}`}
                                        style={getFilterStyle(filter)}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Render stickers on top of the strip */}
                    {stickers.map((s) => (
                        <DraggableSticker key={s.id} sticker={s} onRemove={removeSticker} onResize={resizeSticker} />
                    ))}
                </div>
            </div>
        </div>
    );
}
