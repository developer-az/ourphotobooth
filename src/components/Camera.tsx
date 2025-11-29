"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import styles from "./Camera.module.css";

export type FilterType = "normal" | "bw" | "soft" | "vintage";

interface CameraProps {
    photoCount: number;
    onComplete: (photos: string[][], filter: FilterType) => void; // Changed to array of arrays
    timerDuration?: number; // seconds
}

export default function Camera({ photoCount, onComplete, timerDuration = 3 }: CameraProps) {
    const webcamRef = useRef<Webcam>(null);
    const [photos, setPhotos] = useState<string[][]>([]); // Array of bursts
    const [isCapturing, setIsCapturing] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [flash, setFlash] = useState(false);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
    const [filter, setFilter] = useState<FilterType>("normal");

    const handleDevices = useCallback((mediaDevices: MediaDeviceInfo[]) => {
        const videoDevices = mediaDevices.filter(({ kind }) => kind === "videoinput");
        setDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoDevices[0].deviceId);
        }
    }, [selectedDeviceId]);

    // Capture a burst of frames
    const captureBurst = useCallback(async () => {
        const burst: string[] = [];
        const BURST_COUNT = 30; // 3 seconds at 100ms interval
        const BURST_INTERVAL = 100;

        // We want to capture *before* the flash ideally, or during.
        // Let's capture rapidly.
        for (let i = 0; i < BURST_COUNT; i++) {
            const imageSrc = webcamRef.current?.getScreenshot();
            if (imageSrc && imageSrc.startsWith("data:image/")) {
                console.log(`Frame captured. Length: ${imageSrc.length}, Start: ${imageSrc.substring(0, 30)}...`);
                burst.push(imageSrc);
            } else {
                console.warn("Invalid frame captured:", imageSrc ? "Invalid format" : "Null");
            }
            await new Promise(r => setTimeout(r, BURST_INTERVAL));
        }

        console.log(`Captured burst with ${burst.length} frames`);
        if (burst.length > 0) {
            setFlash(true);
            setTimeout(() => setFlash(false), 100);
            setPhotos((prev) => [...prev, burst]);
        }
    }, []);

    useEffect(() => {
        if (photos.length >= photoCount && isCapturing) {
            setIsCapturing(false);
            onComplete(photos, filter);
        }
    }, [photos, photoCount, isCapturing, onComplete, filter]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isCapturing && photos.length < photoCount) {
            setCountdown(timerDuration);
            let currentCount = timerDuration;

            timer = setInterval(() => {
                currentCount--;
                setCountdown(currentCount);
                if (currentCount <= 0) {
                    clearInterval(timer);
                    captureBurst(); // Trigger burst
                }
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isCapturing, photos.length, photoCount, timerDuration, captureBurst]);

    const startSession = () => {
        setPhotos([]);
        setIsCapturing(true);
    };

    const getFilterStyle = (f: FilterType) => {
        switch (f) {
            case "bw": return { filter: "grayscale(100%) contrast(1.2)" };
            case "soft": return { filter: "brightness(1.1) contrast(0.9) saturate(0.8) blur(0.5px)" };
            case "vintage": return { filter: "sepia(0.5) contrast(1.1) saturate(0.8)" };
            default: return {};
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.webcamWrapper}>
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className={styles.webcam}
                    mirrored={true}
                    videoConstraints={{ deviceId: selectedDeviceId }}
                    style={getFilterStyle(filter)}
                />
                {countdown !== null && countdown > 0 && isCapturing && (
                    <div className={styles.countdownOverlay}>
                        {countdown}
                    </div>
                )}
                {flash && <div className={styles.flash} />}
            </div>

            <div className={styles.controls}>
                {!isCapturing && photos.length === 0 && (
                    <>
                        <div className={styles.settingsRow}>
                            <div className={styles.deviceSelect}>
                                <label htmlFor="cameraSelect">Camera: </label>
                                <select
                                    id="cameraSelect"
                                    value={selectedDeviceId}
                                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                                    className={styles.select}
                                >
                                    {devices.map((device, key) => (
                                        <option key={key} value={device.deviceId}>
                                            {device.label || `Camera ${key + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.filterSelect}>
                                <label>Filter: </label>
                                <div className={styles.filterButtons}>
                                    {(["normal", "bw", "soft", "vintage"] as FilterType[]).map((f) => (
                                        <button
                                            key={f}
                                            className={`${styles.filterBtn} ${filter === f ? styles.activeFilter : ''}`}
                                            onClick={() => setFilter(f)}
                                        >
                                            {f.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={startSession}>
                            Start Capture
                        </button>
                    </>
                )}
                {isCapturing && (
                    <p>Taking photo {photos.length + 1} of {photoCount}...</p>
                )}
            </div>

            {/* Preview of taken shots (Last frame of each burst) */}
            <div className={styles.stripPreview}>
                {photos.map((burst, idx) => (
                    <img key={idx} src={burst[burst.length - 1]} alt={`shot ${idx}`} className={styles.thumb} style={getFilterStyle(filter)} />
                ))}
            </div>
        </div>
    );
}
