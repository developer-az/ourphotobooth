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

// Helper function to apply CSS filters to canvas image data
const applyFilterToCanvas = (canvas: HTMLCanvasElement, filterValue: string) => {
    if (!filterValue) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply grayscale filter if it's BW filter
    if (filterValue.includes('grayscale')) {
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;     // R
            data[i + 1] = gray; // G
            data[i + 2] = gray; // B
        }
    }
    
    // Apply contrast if specified
    if (filterValue.includes('contrast')) {
        const contrastMatch = filterValue.match(/contrast\(([^)]+)\)/);
        if (contrastMatch) {
            const contrastValue = parseFloat(contrastMatch[1]);
            const factor = (259 * (contrastValue * 255 + 255)) / (255 * (259 - contrastValue * 255));
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));     // R
                data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128)); // G
                data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128)); // B
            }
        }
    }
    
    // Apply sepia if specified
    if (filterValue.includes('sepia')) {
        const sepiaMatch = filterValue.match(/sepia\(([^)]+)\)/);
        const sepiaValue = sepiaMatch ? parseFloat(sepiaMatch[1]) : 1;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            data[i] = Math.min(255, (r * (1 - 0.607 * sepiaValue)) + (g * 0.769 * sepiaValue) + (b * 0.189 * sepiaValue));
            data[i + 1] = Math.min(255, (r * 0.349 * sepiaValue) + (g * (1 - 0.314 * sepiaValue)) + (b * 0.168 * sepiaValue));
            data[i + 2] = Math.min(255, (r * 0.272 * sepiaValue) + (g * 0.534 * sepiaValue) + (b * (1 - 0.869 * sepiaValue)));
        }
    }
    
    // Apply brightness if specified
    if (filterValue.includes('brightness')) {
        const brightnessMatch = filterValue.match(/brightness\(([^)]+)\)/);
        if (brightnessMatch) {
            const brightnessValue = parseFloat(brightnessMatch[1]);
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * brightnessValue);
                data[i + 1] = Math.min(255, data[i + 1] * brightnessValue);
                data[i + 2] = Math.min(255, data[i + 2] * brightnessValue);
            }
        }
    }
    
    // Apply saturation if specified
    if (filterValue.includes('saturate')) {
        const saturateMatch = filterValue.match(/saturate\(([^)]+)\)/);
        if (saturateMatch) {
            const saturateValue = parseFloat(saturateMatch[1]);
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const gray = r * 0.299 + g * 0.587 + b * 0.114;
                data[i] = Math.min(255, gray + (r - gray) * saturateValue);
                data[i + 1] = Math.min(255, gray + (g - gray) * saturateValue);
                data[i + 2] = Math.min(255, gray + (b - gray) * saturateValue);
            }
        }
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
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
    const isPreCapturingRef = useRef(false);

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

    // Pre-capture frames in the background for faster GIF generation
    useEffect(() => {
        if (!stripRef.current || photos.length === 0 || isPreCapturingRef.current) return;
        
        const burstLength = photos[0]?.length || 1;
        if (burstLength <= 1) return; // No need to pre-capture single frames
        
        const filterStyle = getFilterStyle(filter);
        const filterValue = filterStyle.filter || '';
        
        // Start pre-capturing in background after a short delay
        const preCaptureTimeout = setTimeout(() => {
            isPreCapturingRef.current = true;
            preCaptureFrames(burstLength, filterValue);
        }, 500); // Reduced delay for faster start
        
        return () => {
            clearTimeout(preCaptureTimeout);
        };
    }, [photos, filter, borderColorState, stickers.length]); // Re-capture if these change

    const preCaptureFrames = async (burstLength: number, filterValue: string) => {
        if (!stripRef.current) return;
        
        // Polyfill for requestIdleCallback
        const requestIdleCallback = (window as any).requestIdleCallback || 
            ((cb: (deadline: IdleDeadline) => void, options?: { timeout: number }) => {
                const start = Date.now();
                return setTimeout(() => {
                    cb({
                        didTimeout: false,
                        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
                    });
                }, 1);
            });

        const captureFrameSync = async (frameIndex: number, filterValue: string) => {
            const cacheKey = `${frameIndex}-${filter}-${borderColorState}`;
            if (frameCacheRef.current.has(cacheKey)) return; // Already cached
            
            // Temporarily set frame index (don't update state to avoid UI flicker)
            const originalIndex = displayFrameIndex;
            
            // Create a hidden clone for pre-capture without affecting UI
            try {
                const canvas = await html2canvas(stripRef.current!, {
                    useCORS: true,
                    scale: 1.5, // Lower scale for faster pre-capture
                    backgroundColor: null,
                    logging: false,
                    allowTaint: false,
                    scrollX: 0,
                    scrollY: 0,
                    onclone: (clonedDoc) => {
                        // Set frame index in cloned doc without affecting main UI
                        const clonedImages = clonedDoc.querySelectorAll('img');
                        const allBursts = photos;
                        clonedImages.forEach((img, imgIndex) => {
                            const burst = allBursts[imgIndex];
                            if (burst) {
                                const frameIndexToShow = frameIndex < burst.length ? frameIndex : burst.length - 1;
                                const src = burst[frameIndexToShow];
                                (img as HTMLImageElement).src = src;
                            }
                            if (filterValue) {
                                const imgElement = img as HTMLImageElement;
                                imgElement.style.setProperty('filter', filterValue, 'important');
                                imgElement.style.filter = filterValue;
                            }
                        });
                        const clonedStrip = clonedDoc.querySelector(`.${styles.photoStrip}`);
                        if (clonedStrip) {
                            (clonedStrip as HTMLElement).style.maxHeight = 'none';
                        }
                    }
                });

                // Apply filter to canvas
                if (filterValue) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const filteredCanvas = document.createElement('canvas');
                        filteredCanvas.width = canvas.width;
                        filteredCanvas.height = canvas.height;
                        const filteredCtx = filteredCanvas.getContext('2d');
                        if (filteredCtx) {
                            filteredCtx.filter = filterValue;
                            filteredCtx.drawImage(canvas, 0, 0);
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(filteredCanvas, 0, 0);
                        }
                    }
                }
                
                frameCacheRef.current.set(cacheKey, canvas);
            } catch (err) {
                console.warn('Pre-capture failed for frame', frameIndex, err);
            }
        };

        // Pre-capture all frames using idle callbacks
        for (let i = 0; i < burstLength; i++) {
            await new Promise<void>((resolve) => {
                const idleCallback = (deadline: IdleDeadline) => {
                    if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
                        captureFrameSync(i, filterValue).then(() => resolve());
                    } else {
                        requestIdleCallback(idleCallback, { timeout: 50 });
                    }
                };
                requestIdleCallback(idleCallback, { timeout: 50 });
            });
        }
        
        isPreCapturingRef.current = false;
    };

    const downloadImage = async (format: "png" | "jpg") => {
        if (!stripRef.current) return;
        setIsExporting(true);
        // Ensure we are showing the static (last) frame
        setDisplayFrameIndex(null);

        // Wait for render to ensure filters are applied and images are loaded
        await new Promise(r => setTimeout(r, 300));

        // Ensure all images are loaded
        const images = stripRef.current.querySelectorAll('img');
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

        // Don't apply filter to DOM images - let html2canvas handle it in onclone
        // This prevents double capture of filtered/unfiltered versions

        try {
            const canvas = await html2canvas(stripRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: null,
                allowTaint: false,
                logging: false,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc, element) => {
                    // Remove any existing filters first to avoid double application
                    const clonedImages = clonedDoc.querySelectorAll('img');
                    clonedImages.forEach((img) => {
                        const imgElement = img as HTMLImageElement;
                        // Clear any existing filter
                        imgElement.style.removeProperty('filter');
                        imgElement.style.filter = 'none';
                        
                        // Apply filter only if we have one
                        if (filterValue) {
                            imgElement.style.setProperty('filter', filterValue, 'important');
                            imgElement.style.filter = filterValue;
                        }
                    });
                    
                    // Remove max-height constraints that might cut off content
                    const clonedStrip = clonedDoc.querySelector(`.${styles.photoStrip}`);
                    if (clonedStrip) {
                        (clonedStrip as HTMLElement).style.maxHeight = 'none';
                    }
                }
            });
            
            // Don't apply filter to canvas - rely on html2canvas capturing the CSS filter from onclone
            // If html2canvas doesn't capture it, we'll need to apply it, but check first
            if (filterValue && !filterValue.includes('blur')) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Sample pixels to check if filter was applied
                    const sample1 = ctx.getImageData(50, 50, 1, 1).data;
                    const sample2 = ctx.getImageData(100, 100, 1, 1).data;
                    const isGrayscale1 = Math.abs(sample1[0] - sample1[1]) < 3 && Math.abs(sample1[1] - sample1[2]) < 3;
                    const isGrayscale2 = Math.abs(sample2[0] - sample2[1]) < 3 && Math.abs(sample2[1] - sample2[2]) < 3;
                    const isGrayscale = isGrayscale1 && isGrayscale2;
                    
                    // Only apply filter if html2canvas didn't capture it
                    if (filterValue.includes('grayscale') && !isGrayscale) {
                        const filterToApply = filterValue.replace(/blur\([^)]+\)/g, '').trim();
                        if (filterToApply) {
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = canvas.width;
                            tempCanvas.height = canvas.height;
                            const tempCtx = tempCanvas.getContext('2d');
                            
                            if (tempCtx) {
                                tempCtx.filter = filterToApply;
                                tempCtx.drawImage(canvas, 0, 0);
                                
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                                ctx.drawImage(tempCanvas, 0, 0);
                            }
                        }
                    }
                }
            }
            
            canvas.toBlob((blob) => {
                if (!blob) {
                    setIsExporting(false);
                    return;
                }
                
                // Mobile-friendly download approach
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `photobooth-${Date.now()}.${format}`;
                link.style.display = 'none';
                document.body.appendChild(link);
                
                // Trigger download
                link.click();
                
                // Cleanup
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
        if (!stripRef.current) return;
        setIsExporting(true);

        try {
            const gifModule = await import("gif.js");
            const GIF = gifModule.default || gifModule;

            // Determine burst length (assuming all bursts are same length)
            const burstLength = photos[0]?.length || 1;
            console.log("GIF Generation: Burst length is", burstLength, "Total photos:", photos.length);

            // Get filter value to apply
            const filterStyle = getFilterStyle(filter);
            const filterValue = filterStyle.filter || '';

            // First, capture a test frame to get the actual canvas dimensions
            // This ensures the GIF dimensions match exactly with PNG/JPG exports
            setDisplayFrameIndex(0);
            await new Promise(r => setTimeout(r, 100));

            // Ensure all images are loaded for the test frame (they should already be loaded)
            const testImages = stripRef.current.querySelectorAll('img');
            const incompleteTestImages = Array.from(testImages).filter(img => !img.complete);
            if (incompleteTestImages.length > 0) {
                await Promise.all(incompleteTestImages.map((img) => {
                    return new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve;
                        setTimeout(resolve, 50); // Short timeout
                    });
                }));
            }

            // Apply filter to test images before capture
            if (filterValue) {
                testImages.forEach((img) => {
                    const imgElement = img as HTMLImageElement;
                    imgElement.style.setProperty('filter', filterValue, 'important');
                    imgElement.style.filter = filterValue;
                });
                await new Promise(r => setTimeout(r, 50));
            }

            // Capture test frame to get dimensions - use same scale as GIF frames for consistency
            let testCanvas = await html2canvas(stripRef.current, {
                useCORS: true,
                scale: 1.5, // Match GIF scale for consistency
                backgroundColor: null,
                logging: false,
                allowTaint: false,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc, element) => {
                    // Remove any existing filters first
                    const clonedImages = clonedDoc.querySelectorAll('img');
                    clonedImages.forEach((img) => {
                        const imgElement = img as HTMLImageElement;
                        imgElement.style.removeProperty('filter');
                        imgElement.style.filter = 'none';
                        
                        if (filterValue) {
                            imgElement.style.setProperty('filter', filterValue, 'important');
                            imgElement.style.filter = filterValue;
                        }
                    });
                    // Remove max-height constraints that might cut off content
                    const clonedStrip = clonedDoc.querySelector(`.${styles.photoStrip}`);
                    if (clonedStrip) {
                        (clonedStrip as HTMLElement).style.maxHeight = 'none';
                    }
                }
            });

            // Only apply filter if html2canvas didn't capture it
            if (filterValue && !filterValue.includes('blur')) {
                const ctx = testCanvas.getContext('2d');
                if (ctx) {
                    const sample1 = ctx.getImageData(50, 50, 1, 1).data;
                    const sample2 = ctx.getImageData(100, 100, 1, 1).data;
                    const isGrayscale1 = Math.abs(sample1[0] - sample1[1]) < 3 && Math.abs(sample1[1] - sample1[2]) < 3;
                    const isGrayscale2 = Math.abs(sample2[0] - sample2[1]) < 3 && Math.abs(sample2[1] - sample2[2]) < 3;
                    const isGrayscale = isGrayscale1 && isGrayscale2;
                    
                    if (filterValue.includes('grayscale') && !isGrayscale) {
                        const filterToApply = filterValue.replace(/blur\([^)]+\)/g, '').trim();
                        if (filterToApply) {
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = testCanvas.width;
                            tempCanvas.height = testCanvas.height;
                            const tempCtx = tempCanvas.getContext('2d');
                            if (tempCtx) {
                                tempCtx.filter = filterToApply;
                                tempCtx.drawImage(testCanvas, 0, 0);
                                ctx.clearRect(0, 0, testCanvas.width, testCanvas.height);
                                ctx.drawImage(tempCanvas, 0, 0);
                            }
                        }
                    }
                }
            }

            // Use the actual canvas dimensions from html2canvas
            const width = testCanvas.width;
            const height = testCanvas.height;

            const gif = new GIF({
                workers: 4, // Increased workers for faster processing
                quality: 15, // Reduced quality slightly for faster encoding
                width: width,
                height: height,
                workerScript: '/gif.worker.js',
                repeat: 0 // Loop indefinitely for smooth playback
            });

            // Cycle through each frame of the burst - loop multiple times to make GIF longer
            const loops = 3; // Loop the burst 3 times for a longer GIF
            const totalFrames = loops * burstLength;
            let currentFrame = 0;

            // Helper function to get or capture a frame
            const getFrame = async (frameIndex: number): Promise<HTMLCanvasElement> => {
                const cacheKey = `${frameIndex}-${filter}-${borderColorState}`;
                
                // Check cache first
                if (frameCacheRef.current.has(cacheKey)) {
                    const cached = frameCacheRef.current.get(cacheKey)!;
                    // Clone cached canvas to avoid issues
                    const cloned = document.createElement('canvas');
                    cloned.width = cached.width;
                    cloned.height = cached.height;
                    cloned.getContext('2d')?.drawImage(cached, 0, 0);
                    return cloned;
                }

                // Not cached, capture it now
                setDisplayFrameIndex(frameIndex);
                await new Promise(r => setTimeout(r, 10)); // Minimal wait

                let canvas = await html2canvas(stripRef.current!, {
                    useCORS: true,
                    scale: 1.5,
                    backgroundColor: null,
                    logging: false,
                    allowTaint: false,
                    scrollX: 0,
                    scrollY: 0,
                    onclone: (clonedDoc) => {
                        // Remove any existing filters first
                        const clonedImages = clonedDoc.querySelectorAll('img');
                        clonedImages.forEach((img) => {
                            const imgElement = img as HTMLImageElement;
                            imgElement.style.removeProperty('filter');
                            imgElement.style.filter = 'none';
                            
                            if (filterValue) {
                                imgElement.style.setProperty('filter', filterValue, 'important');
                                imgElement.style.filter = filterValue;
                            }
                        });
                        const clonedStrip = clonedDoc.querySelector(`.${styles.photoStrip}`);
                        if (clonedStrip) {
                            (clonedStrip as HTMLElement).style.maxHeight = 'none';
                        }
                    }
                });

                // Only apply filter if html2canvas didn't capture it
                if (filterValue && !filterValue.includes('blur')) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const sample1 = ctx.getImageData(50, 50, 1, 1).data;
                        const sample2 = ctx.getImageData(100, 100, 1, 1).data;
                        const isGrayscale1 = Math.abs(sample1[0] - sample1[1]) < 3 && Math.abs(sample1[1] - sample1[2]) < 3;
                        const isGrayscale2 = Math.abs(sample2[0] - sample2[1]) < 3 && Math.abs(sample2[1] - sample2[2]) < 3;
                        const isGrayscale = isGrayscale1 && isGrayscale2;
                        
                        if (filterValue.includes('grayscale') && !isGrayscale) {
                            const filterToApply = filterValue.replace(/blur\([^)]+\)/g, '').trim();
                            if (filterToApply) {
                                const tempCanvas = document.createElement('canvas');
                                tempCanvas.width = canvas.width;
                                tempCanvas.height = canvas.height;
                                const tempCtx = tempCanvas.getContext('2d');
                                if (tempCtx) {
                                    tempCtx.filter = filterToApply;
                                    tempCtx.drawImage(canvas, 0, 0);
                                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                                    ctx.drawImage(tempCanvas, 0, 0);
                                }
                            }
                        }
                    }
                }

                // Cache for future use
                frameCacheRef.current.set(cacheKey, canvas);
                return canvas;
            };

            // Capture frames in batches for better performance
            for (let loop = 0; loop < loops; loop++) {
                for (let i = 0; i < burstLength; i++) {
                    const canvas = await getFrame(i);
                    
                    // Add to GIF immediately
                    gif.addFrame(canvas, { delay: 66 });
                    
                    // Update progress: 0-80% for frame capture
                    currentFrame++;
                    const captureProgress = Math.round((currentFrame / totalFrames) * 80);
                    setGifProgress(captureProgress);
                    
                    // Yield to browser every few frames to keep UI responsive
                    if (currentFrame % 5 === 0) {
                        await new Promise(r => setTimeout(r, 0));
                    }
                }
            }

            // Reset to static view
            setDisplayFrameIndex(null);

            gif.on('finished', (blob: Blob) => {
                setGifProgress(100);
                // Mobile-friendly download approach
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `photobooth-motion-${Date.now()}.gif`;
                link.style.display = 'none';
                document.body.appendChild(link);
                
                // Trigger download
                link.click();
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                setIsExporting(false);
                    setGifProgress(0);
                }, 100);
            });

            gif.on('progress', (p: number) => {
                // Update progress during rendering phase: 80-99% for render
                const renderProgress = Math.round(p * 100);
                const renderProgressScaled = 80 + Math.round(renderProgress * 0.19); // 80-99%
                setGifProgress(Math.min(99, renderProgressScaled));
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
                        {isExporting && gifProgress > 0 && (
                            <div className={styles.progressBar}>
                                <div className={styles.progressBarFill} style={{ width: `${gifProgress}%` }}></div>
                                <span className={styles.progressText}>{gifProgress}%</span>
                            </div>
                        )}
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
