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

    const burstRef = useRef<string[]>([]);

    useEffect(() => {
        let countdownTimer: NodeJS.Timeout;
        let captureTimer: NodeJS.Timeout;

        if (isCapturing && photos.length < photoCount) {
            setCountdown(timerDuration);
            let currentCount = timerDuration;
            burstRef.current = []; // Reset burst for new photo

            // Start capturing frames immediately (pre-capture)
            // This captures the "getting ready" moments
            captureTimer = setInterval(() => {
                const imageSrc = webcamRef.current?.getScreenshot();
                if (imageSrc && imageSrc.startsWith("data:image/")) {
                    burstRef.current.push(imageSrc);
                }
            }, 100); // 10fps

            // Start countdown
            countdownTimer = setInterval(() => {
                currentCount--;
                setCountdown(currentCount);

                if (currentCount <= 0) {
                    // STOP everything
                    clearInterval(countdownTimer);
                    clearInterval(captureTimer);

                    // Final Snap (The actual photo)
                    const finalSnap = webcamRef.current?.getScreenshot();
                    if (finalSnap && finalSnap.startsWith("data:image/")) {
                        burstRef.current.push(finalSnap);
                    }

                    // Flash immediately
                    setFlash(true);
                    setTimeout(() => setFlash(false), 100);

                    // Save the burst
                    setPhotos((prev) => [...prev, [...burstRef.current]]);
                }
            }, 1000);
        }

        return () => {
            clearInterval(countdownTimer);
            clearInterval(captureTimer);
        };
    }, [isCapturing, photos.length, photoCount, timerDuration]);

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

            {/* Preview of taken shots (Last frame of each burst - The Snap) */}
            <div className={styles.stripPreview}>
                {photos.map((burst, idx) => (
                    <img key={idx} src={burst[burst.length - 1]} alt={`shot ${idx}`} className={styles.thumb} style={getFilterStyle(filter)} />
                ))}
            </div>
        </div>
    );
}
