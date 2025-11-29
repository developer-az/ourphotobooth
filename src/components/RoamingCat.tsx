"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./RoamingCat.module.css";

export default function RoamingCat() {
    const [position, setPosition] = useState({ x: 50, y: 50 }); // Percentages
    const [direction, setDirection] = useState<"left" | "right">("right");
    const [isMoving, setIsMoving] = useState(false);
    const [isSleeping, setIsSleeping] = useState(false);
    const [transitionDuration, setTransitionDuration] = useState(0);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const moveCat = () => {
        // Wake up if sleeping
        setIsSleeping(false);

        // Calculate new random position
        // Keep within 5% to 95% to avoid going off screen completely
        const newX = 5 + Math.random() * 90;
        const newY = 5 + Math.random() * 90;

        // Determine direction
        const newDirection = newX > position.x ? "right" : "left";
        setDirection(newDirection);

        // Calculate distance to determine duration (constant speed)
        // Approximate distance in "percentage units"
        const dx = newX - position.x;
        const dy = newY - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Speed: 10 percentage units per second
        const speed = 10;
        const duration = distance / speed;

        setTransitionDuration(duration);
        setIsMoving(true);
        setPosition({ x: newX, y: newY });

        // Schedule next move after arrival + pause
        const pauseDuration = 2000 + Math.random() * 3000; // 2-5s pause

        timeoutRef.current = setTimeout(() => {
            setIsMoving(false);
            // Randomly decide to sleep
            if (Math.random() > 0.5) {
                setIsSleeping(true);
            }
            timeoutRef.current = setTimeout(moveCat, pauseDuration);
        }, duration * 1000);
    };

    useEffect(() => {
        // Start moving after a short initial delay
        timeoutRef.current = setTimeout(moveCat, 1000);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div
            className={`${styles.cat} ${isMoving ? styles.walking : ''}`}
            style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transition: `left ${transitionDuration}s linear, top ${transitionDuration}s linear`,
                transform: `translate(-50%, -50%) scaleX(${direction === "left" ? -1 : 1})`,
            }}
        >
            <img
                src={isSleeping ? "/cat_sleeping.png" : "/cat.png"}
                alt="Roaming Cat"
            />
        </div>
    );
}
