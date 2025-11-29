"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import LayoutSelector, { LayoutType } from "@/components/LayoutSelector";
import Camera from "@/components/Camera";
import styles from "./booth.module.css";
import Link from "next/link";
import { useNavbar } from "@/context/NavbarContext";

const PhotoEditor = dynamic(() => import("@/components/PhotoEditor"), { ssr: false });

type Step = "layout" | "camera" | "edit";

const LAYOUT_CONFIG: Record<LayoutType, { count: number }> = {
    "4-diagonal": { count: 4 },
    "3-diagonal": { count: 3 },
    "4-square": { count: 4 },
    "6-grid": { count: 6 },
};

export default function BoothPage() {
    const [step, setStep] = useState<Step>("layout");
    const [selectedLayout, setSelectedLayout] = useState<LayoutType | null>(null);
    const [capturedPhotos, setCapturedPhotos] = useState<string[][]>([]); // Array of bursts
    const [selectedFilter, setSelectedFilter] = useState<"normal" | "bw" | "soft" | "vintage">("normal");

    const handleLayoutSelect = (layout: LayoutType) => {
        setSelectedLayout(layout);
        setStep("camera");
    };

    const handleCaptureComplete = (photos: string[][], filter: "normal" | "bw" | "soft" | "vintage") => {
        setCapturedPhotos(photos);
        setSelectedFilter(filter);
        setStep("edit");
    };

    const { setCenterContent } = useNavbar();

    React.useEffect(() => {
        setCenterContent(
            <div className={styles.steps}>
                <span className={step === "layout" ? styles.activeStep : ""}>Layout</span>
                <span className={styles.separator}>›</span>
                <span className={step === "camera" ? styles.activeStep : ""}>Camera</span>
                <span className={styles.separator}>›</span>
                <span className={step === "edit" ? styles.activeStep : ""}>Edit</span>
            </div>
        );
        return () => setCenterContent(null);
    }, [step, setCenterContent]);

    return (
        <main className={styles.container}>
            {/* Header removed to avoid duplication with global Navbar */}

            <div className={styles.content}>
                {step === "layout" && (
                    <LayoutSelector onSelect={handleLayoutSelect} />
                )}

                {step === "camera" && selectedLayout && (
                    <Camera
                        photoCount={LAYOUT_CONFIG[selectedLayout].count}
                        onComplete={handleCaptureComplete}
                    />
                )}

                {step === "edit" && selectedLayout && (
                    <PhotoEditor
                        photos={capturedPhotos}
                        layout={selectedLayout}
                        filter={selectedFilter}
                        onReset={() => window.location.reload()}
                    />
                )}
            </div>
        </main>
    );
}
