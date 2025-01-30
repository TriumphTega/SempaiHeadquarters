'use client';

import { useState } from "react";

export default function Popup({ onClose, onSubmit }) {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    onSubmit(reason); // Pass reason back to parent component
    onClose(); // Close popup after submission
  };

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>Why do you want to be a creator?</h2>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        <div className="popup-buttons">
          <button onClick={handleSubmit} className="btn-submit">
            Submit
          </button>
          <button onClick={onClose} className="btn-close">
            Cancel
          </button>
        </div>
      </div>

      <style jsx>{`
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .popup-content {
          background: #222;
          padding: 20px;
          border-radius: 10px;
          width: 90%;
          max-width: 400px;
          text-align: center;
          color: white;
        }
        textarea {
          width: 100%;
          height: 80px;
          padding: 10px;
          background: #333;
          border: 1px solid #555;
          color: white;
        }
        .popup-buttons {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
        }
        .btn-submit {
          background: #ff9900;
          color: white;
          padding: 10px;
          border: none;
          cursor: pointer;
        }
        .btn-close {
          background: #777;
          color: white;
          padding: 10px;
          border: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
