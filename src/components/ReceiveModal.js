"use client";

import { FaQrcode, FaCopy, FaTimes } from "react-icons/fa";
import styles from "../styles/ReceiveModal.module.css";

export default function ReceiveModal({ isOpen, onClose, address }) {
  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    // Could add a toast notification here
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <FaTimes />
        </button>
        
        <div className={styles.iconContainer}>
          <FaQrcode className={styles.qrIcon} />
        </div>
        
        <h3 className={styles.modalTitle}>Receive Crypto</h3>
        <p className={styles.modalMessage}>Share this address to receive crypto:</p>
        
        <div className={styles.addressContainer}>
          <p className={styles.addressText}>{address}</p>
          <button className={styles.copyButton} onClick={handleCopy} title="Copy address">
            <FaCopy />
          </button>
        </div>
        
        <button className={styles.doneButton} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
