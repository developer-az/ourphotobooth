"use client";

import React, { useState, useRef, useEffect } from "react";
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

// Helper function to burn in CSS filters into image elements
const burnInFilter = (doc: Document, filterValue: string) => {
    if (!filterValue || filterValue === 'none') return;
    const images = doc.querySelectorAll('img');
    images.forEach((img) => {
        const imgElement = img as HTMLImageElement;

        // Skip if image not loaded or no dimensions
        if (!imgElement.naturalWidth || !imgElement.naturalHeight) return;

        try {
            const canvas = document.createElement('canvas');
            canvas.width = imgElement.naturalWidth;
            canvas.height = imgElement.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Apply the filter to the context
                ctx.filter = filterValue;
                ctx.drawImage(imgElement, 0, 0);

                // Replace image source with the filtered version
                imgElement.src = canvas.toDataURL('image/png');

                // Remove CSS filter to avoid double application
                imgElement.style.filter = 'none';
                imgElement.style.removeProperty('filter');
            }
        } catch (e) {
            console.error("Error burning in filter:", e);
        }
    });
};

// Sub-component to handle nodeRef logic cleanly
function DraggableSticker({ sticker, onRemove, onResize, onStop, scaleFactor = 1 }: {
    sticker: { id: number; content: string; x: number; y: number; scale: number },
    onRemove: (id: number) => void,
    onResize: (id: number, delta: number) => void,
    onStop: (id: number, x: number, y: number) => void,
    scaleFactor?: number
}) {
    const nodeRef = useRef(null);
    return (
        <Draggable
            nodeRef={nodeRef}
            position={{ x: sticker.x, y: sticker.y }}
            onStop={(e, data) => onStop(sticker.id, data.x, data.y)}
            scale={scaleFactor}
        >
            <div ref={nodeRef} className={styles.sticker} style={{ position: 'absolute', zIndex: 10, cursor: 'move' }}>
                <div style={{ transform: `scale(${sticker.scale})`, transformOrigin: 'center center' }}>
                    <div className={styles.stickerContent}>
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
            </div>
        </Draggable>
    );
}

const PREVIEW_SCALE = 0.7;

export default function PhotoEditor({ photos, layout, filter, onReset }: PhotoEditorProps) {
    console.log("PhotoEditor received photos:", photos.length, "bursts");
    if (photos.length > 0) {
        console.log("First burst length:", photos[0].length);
        console.log("First photo sample:", photos[0][0]?.substring(0, 30));
    }
    const [borderColorState, setBorderColorState] = useState("#ffffff");

    // Wrapper to clear cache when border color changes
    const setBorderColor = (color: string) => {
        setBorderColorState(color);
        frameCacheRef.current.clear();
    };

    const borderColor = borderColorState; // Use state value
    const [stickers, setStickers] = useState<{ id: number; content: string; x: number; y: number; scale: number }[]>([]);
    const stripRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [gifProgress, setGifProgress] = useState(0);

    // State to control which frame of the burst is currently displayed
    // For editing, we usually show the last frame (the "final" shot)
    // But for GIF generation, we will programmatically cycle this.
    const [displayFrameIndex, setDisplayFrameIndex] = useState<number | null>(null); // null means show last frame

    // Cache for pre-captured frames to speed up GIF generation
    const frameCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

    const addSticker = (content: string) => {
        setStickers([...stickers, { id: Date.now(), content, x: 0, y: 0, scale: 1 }]);
        // Clear cache when stickers change
        frameCacheRef.current.clear();
    };

    const removeSticker = (id: number) => {
        setStickers(stickers.filter((s) => s.id !== id));
        // Clear cache when stickers change
        frameCacheRef.current.clear();
    };

    const resizeSticker = (id: number, delta: number) => {
        setStickers(stickers.map(s => {
            if (s.id === id) {
                const newScale = Math.max(0.5, Math.min(3, s.scale + delta));
                return { ...s, scale: newScale };
            }
            return s;
        }));
        // Clear cache when stickers change
        frameCacheRef.current.clear();
    };

    const updateStickerPosition = (id: number, x: number, y: number) => {
        setStickers(stickers.map(s => {
            if (s.id === id) {
                return { ...s, x, y };
            }
            return s;
        }));
        frameCacheRef.current.clear();
    };

    const exportRef = useRef<HTMLDivElement>(null);

    const downloadImage = async (format: "png" | "jpg") => {
        if (!exportRef.current) return;
        setIsExporting(true);
        // Ensure we are showing the static (last) frame
        setDisplayFrameIndex(null);

        // Wait for render to ensure filters are applied and images are loaded
        await new Promise(r => setTimeout(r, 300));

        // Ensure all images in the EXPORT container are loaded
        const images = exportRef.current.querySelectorAll('img');
        const imagePromises = Array.from(images).map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve; // Continue even if image fails to load
            });
        });
        await Promise.all(imagePromises);
        await new Promise(r => setTimeout(r, 100)); // Extra wait for CSS filters to render

        // Get the filter style to apply
        const filterStyle = getFilterStyle(filter);
        const filterValue = filterStyle.filter || '';

        try {
            const canvas = await html2canvas(exportRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: null,
                allowTaint: false,
                logging: false,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => {
                    // Burn in filter
                    burnInFilter(clonedDoc, filterValue);
                }
            });

            canvas.toBlob((blob) => {
                if (!blob) {
                    setIsExporting(false);
                    return;
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `photobooth-${Date.now()}.${format}`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();

                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);

                setIsExporting(false);
            }, `image/${format === "jpg" ? "jpeg" : "png"}`, format === "jpg" ? 0.92 : 1);
        } catch (err) {
            console.error("Export failed", err);
            setIsExporting(false);
        }
    };

    const downloadGif = async () => {
        if (!exportRef.current) return;
        setIsExporting(true);

        try {
            const gifModule = await import("gif.js");
            const GIF = gifModule.default || gifModule;

            const burstLength = photos[0]?.length || 1;
            if (burstLength <= 1) {
                console.warn("Burst length is 1 or less, cannot generate animated GIF");
                setIsExporting(false);
                return;
            }

            const filterStyle = getFilterStyle(filter);
            const filterValue = filterStyle.filter || '';

            setDisplayFrameIndex(0);
            await new Promise(r => setTimeout(r, 150));

            // Ensure all images in EXPORT container are loaded
            const testImages = exportRef.current.querySelectorAll('img');
            const incompleteTestImages = Array.from(testImages).filter(img => !img.complete);
            if (incompleteTestImages.length > 0) {
                await Promise.all(incompleteTestImages.map((img) => {
                    return new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve;
                        setTimeout(resolve, 300);
                    });
                }));
            }

            if (filterValue) {
                testImages.forEach((img) => {
                    const imgElement = img as HTMLImageElement;
                    imgElement.style.setProperty('filter', filterValue, 'important');
                    imgElement.style.filter = filterValue;
                });
                await new Promise(r => setTimeout(r, 50));
            }

            // Capture test frame from EXPORT container
            let testCanvas = await html2canvas(exportRef.current, {
                useCORS: true,
                scale: 1.5,
                backgroundColor: null,
                logging: false,
                allowTaint: false,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => {
                    burnInFilter(clonedDoc, filterValue);
                }
            });

            const width = testCanvas.width;
            const height = testCanvas.height;

            const gif = new GIF({
                workers: 4,
                quality: 15,
                width: width,
                height: height,
                workerScript: '/gif.worker.js',
                repeat: 0,
                background: borderColor
            });

            const loops = 3;
            const totalFrames = loops * burstLength;
            let currentFrame = 0;

            const getFrame = async (frameIndex: number): Promise<HTMLCanvasElement> => {
                const cacheKey = `${frameIndex}-${filter}-${borderColorState}`;

                if (frameCacheRef.current.has(cacheKey)) {
                    const cached = frameCacheRef.current.get(cacheKey)!;
                    const cloned = document.createElement('canvas');
                    cloned.width = cached.width;
                    cloned.height = cached.height;
                    cloned.getContext('2d')?.drawImage(cached, 0, 0);
                    return cloned;
                }

                setDisplayFrameIndex(frameIndex);
                await new Promise(r => setTimeout(r, 100));

                // Wait for images in EXPORT container
                if (exportRef.current) {
                    const images = exportRef.current.querySelectorAll('img');
                    await Promise.all(Array.from(images).map(img => {
                        if (img.complete) return Promise.resolve();
                        return new Promise(resolve => {
                            img.onload = resolve;
                            img.onerror = resolve;
                            setTimeout(resolve, 300);
                        });
                    }));
                }

                await new Promise(r => setTimeout(r, 50));

                let canvas = await html2canvas(exportRef.current!, {
                    useCORS: true,
                    scale: 1.5,
                    backgroundColor: null,
                    logging: false,
                    allowTaint: false,
                    scrollX: 0,
                    scrollY: 0,
                    onclone: (clonedDoc) => {
                        burnInFilter(clonedDoc, filterValue);
                    }
                });

                frameCacheRef.current.set(cacheKey, canvas);
                return canvas;
            };

            for (let loop = 0; loop < loops; loop++) {
                for (let i = 0; i < burstLength; i++) {
                    const canvas = await getFrame(i);
                    gif.addFrame(canvas, { delay: 100 });
                    currentFrame++;
                    const captureProgress = Math.round((currentFrame / totalFrames) * 80);
                    setGifProgress(captureProgress);
                    if (currentFrame % 5 === 0) {
                        await new Promise(r => setTimeout(r, 0));
                    }
                }
            }

            setDisplayFrameIndex(null);

            gif.on('finished', (blob: Blob) => {
                setGifProgress(100);
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `photobooth-motion-${Date.now()}.gif`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    setIsExporting(false);
                    setGifProgress(0);
                }, 100);
            });

            gif.on('progress', (p: number) => {
                const renderProgress = Math.round(p * 100);
                const renderProgressScaled = 80 + Math.round(renderProgress * 0.19);
                setGifProgress(Math.min(99, renderProgressScaled));
            });

            gif.render();

        } catch (err) {
            console.error("GIF export failed", err);
            setIsExporting(false);
            setDisplayFrameIndex(null);
        }
    };

    const [scale, setScale] = useState(0.7);
    const [wrapperHeight, setWrapperHeight] = useState<number | undefined>(undefined);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    // Calculate optimal scale to fit screen and fix scrolling issues
    useEffect(() => {
        const calculateScale = () => {
            if (!stripRef.current || !previewContainerRef.current) return;

            const containerHeight = previewContainerRef.current.clientHeight;
            const stripHeight = stripRef.current.scrollHeight;
            const containerWidth = previewContainerRef.current.clientWidth;
            const stripWidth = stripRef.current.scrollWidth;

            // Calculate scale to fit height with some padding
            // But don't make it too small (min 0.5) or too big (max 1.0)
            const padding = 40;
            const availableHeight = containerHeight - padding;

            let newScale = availableHeight / stripHeight;

            // Also check width constraint
            const widthScale = (containerWidth - padding) / stripWidth;
            newScale = Math.min(newScale, widthScale);

            // Clamp scale
            newScale = Math.max(0.4, Math.min(0.9, newScale));

            setScale(newScale);
            setWrapperHeight(stripHeight * newScale);
        };

        // Initial calculation
        calculateScale();

        // Recalculate on resize
        const resizeObserver = new ResizeObserver(calculateScale);
        if (previewContainerRef.current) {
            resizeObserver.observe(previewContainerRef.current);
        }
        if (stripRef.current) {
            resizeObserver.observe(stripRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [photos, layout]); // Recalculate when content changes

    return (
        <div className={styles.container}>
            {/* Hidden Export Container - Renders unscaled for 1:1 capture */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '380px', zIndex: -1 }}>
                <div
                    ref={exportRef}
                    className={`${styles.photoStrip} ${styles[getLayoutClassName(layout)]}`}
                    style={{ backgroundColor: borderColor, width: '100%', maxWidth: '380px' }}
                >
                    <div className={styles.header}>
                        <span className={styles.date}>{new Date().toLocaleDateString()}</span>
                        <span className={styles.brand}>PHOTOBOOTH</span>
                    </div>

                    <div className={styles.grid}>
                        {photos.map((burst, i) => {
                            const frameIndex = displayFrameIndex === null ? burst.length - 1 : Math.min(displayFrameIndex, burst.length - 1);
                            const src = burst[frameIndex];
                            return (
                                <div key={i} className={styles.photoFrame}>
                                    <img
                                        key={`${i}-${frameIndex}`}
                                        src={src}
                                        alt={`photo-${i}-${frameIndex}`}
                                        style={getFilterStyle(filter)}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Static Stickers for Export */}
                    {stickers.map((s) => (
                        <div
                            key={s.id}
                            className={styles.sticker}
                            style={{
                                position: 'absolute',
                                zIndex: 10,
                                transform: `translate(${s.x}px, ${s.y}px)`,
                                WebkitTransform: `translate(${s.x}px, ${s.y}px)`
                            }}
                        >
                            <div style={{ transform: `scale(${s.scale})`, transformOrigin: 'center center' }}>
                                <div className={styles.stickerContent}>
                                    {s.content}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

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
                        {isExporting && gifProgress > 0 && (
                            <div className={styles.progressBar}>
                                <div className={styles.progressBarFill} style={{ width: `${gifProgress}%` }}></div>
                                <span className={styles.progressText}>{gifProgress}%</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.previewArea} ref={previewContainerRef}>
                <div style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    width: '100%',
                    height: wrapperHeight ? `${wrapperHeight}px` : 'auto',
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '2rem' // Add some bottom breathing room
                }}>
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
                                            onLoad={() => {
                                                // Trigger scale recalculation when image loads
                                                if (previewContainerRef.current && stripRef.current) {
                                                    const containerHeight = previewContainerRef.current.clientHeight;
                                                    const stripHeight = stripRef.current.scrollHeight;
                                                    const padding = 40;
                                                    const availableHeight = containerHeight - padding;
                                                    let newScale = availableHeight / stripHeight;
                                                    const containerWidth = previewContainerRef.current.clientWidth;
                                                    const stripWidth = stripRef.current.scrollWidth;
                                                    const widthScale = (containerWidth - padding) / stripWidth;
                                                    newScale = Math.min(newScale, widthScale);
                                                    newScale = Math.max(0.4, Math.min(0.9, newScale));
                                                    setScale(newScale);
                                                    setWrapperHeight(stripHeight * newScale);
                                                }
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Render stickers on top of the strip */}
                        {stickers.map((s) => (
                            <DraggableSticker
                                key={s.id}
                                sticker={s}
                                onRemove={removeSticker}
                                onResize={resizeSticker}
                                onStop={updateStickerPosition}
                                scaleFactor={scale}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
