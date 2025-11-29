"use client";

import styles from "./Footer.module.css";
import { Heart } from "lucide-react";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <p className={styles.copyright}>
                    &copy; {new Date().getFullYear()} Anthony Zhou
                </p>
                <p className={styles.dedication}>
                    made for eva <Heart size={12} fill="#ff6b6b" stroke="none" className={styles.heart} />
                </p>
            </div>
        </footer>
    );
}
