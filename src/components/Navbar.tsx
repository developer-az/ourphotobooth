"use client";

import Link from "next/link";
import styles from "./Navbar.module.css";
import { Camera } from "lucide-react";

import { useNavbar } from "@/context/NavbarContext";

export default function Navbar() {
    const { centerContent } = useNavbar();

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <Link href="/" className={styles.logo}>
                    <Camera className={styles.icon} />
                    <span>Photobooth</span>
                </Link>

                <div className={styles.centerContent}>
                    {centerContent}
                </div>

                <div className={styles.links}>
                    <Link href="/" className={styles.link}>Home</Link>
                    <Link href="/booth" className={styles.link}>Start Booth</Link>
                </div>
            </div>
        </nav>
    );
}
