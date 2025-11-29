"use client";

import React from "react";
import styles from "./LayoutSelector.module.css";

export type LayoutType = "4-diagonal" | "3-diagonal" | "4-square" | "6-grid";

interface LayoutSelectorProps {
  onSelect: (layout: LayoutType) => void;
}

export default function LayoutSelector({ onSelect }: LayoutSelectorProps) {
  return (
    <div className={styles.container}>
      <h2>Choose your layout</h2>
      <div className={styles.grid}>
        <button className={styles.option} onClick={() => onSelect("4-diagonal")}>
          <div className={styles.preview4Diag}>
            <span></span><span></span><span></span><span></span>
          </div>
          <p>4-Cut Diagonal</p>
        </button>
        <button className={styles.option} onClick={() => onSelect("3-diagonal")}>
           <div className={styles.preview3Diag}>
            <span></span><span></span><span></span>
          </div>
          <p>3-Cut Diagonal</p>
        </button>
        <button className={styles.option} onClick={() => onSelect("4-square")}>
           <div className={styles.preview4Sq}>
            <span></span><span></span><span></span><span></span>
          </div>
          <p>4-Cut Square</p>
        </button>
        <button className={styles.option} onClick={() => onSelect("6-grid")}>
           <div className={styles.preview6Grid}>
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
          <p>6-Cut Grid</p>
        </button>
      </div>
    </div>
  );
}
