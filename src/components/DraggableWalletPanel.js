"use client";

import { useState, useRef } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { FaWallet } from "react-icons/fa";
import styles from "../styles/MangaHome.module.css"; // Adjust path based on your project structure

export default function DraggableWalletPanel({ connected, balance, weeklyPoints, toggleWalletPanel, walletPanelOpen }) {
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 100 }); // Default bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);

  // Mouse events for desktop
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - startPos.x;
    const newY = e.clientY - startPos.y;
    setPosition({
      x: Math.max(0, Math.min(newX, window.innerWidth - (panelRef.current?.offsetWidth || 320))),
      y: Math.max(0, Math.min(newY, window.innerHeight - (panelRef.current?.offsetHeight || 70))),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch events for mobile
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setStartPos({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newX = touch.clientX - startPos.x;
    const newY = touch.clientY - startPos.y;
    setPosition({
      x: Math.max(0, Math.min(newX, window.innerWidth - (panelRef.current?.offsetWidth || 320))),
      y: Math.max(0, Math.min(newY, window.innerHeight - (panelRef.current?.offsetHeight || 70))),
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  return (
    <div
      ref={panelRef}
      className={`${styles.walletPanel} ${walletPanelOpen ? styles.walletPanelOpen : ""} ${isDragging ? styles.dragging : ""}`}
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {connected ? (
        <>
          <button className={styles.walletToggle} onClick={toggleWalletPanel}>
            <FaWallet /> <span className={styles.walletSummary}>{balance} SMP | {weeklyPoints} Pts</span>
          </button>
          <div className={styles.walletContent}>
            <p><span className={styles.balanceLabel}>Balance:</span> {balance} SMP</p>
            <p><span className={styles.pointsLabel}>Points:</span> {weeklyPoints}</p>
          </div>
        </>
      ) : (
        <div className={styles.connectCallout}>
          <p>Connect your wallet to explore premium manga worlds</p>
          <WalletMultiButton className={styles.walletConnectBtn} />
        </div>
      )}
    </div>
  );
}