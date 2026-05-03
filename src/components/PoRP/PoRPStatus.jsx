/**
 * PoRP Status Indicator - Shows reading session status and provides feedback
 */

import React, { useState, useEffect } from 'react';
import { FaBook, FaCheckCircle, FaExclamationTriangle, FaClock, FaChartLine } from 'react-icons/fa';

export default function PoRPStatus({ isActive, receipt, onDismiss }) {
  const [showDetails, setShowDetails] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Function to open dashboard - this will be passed from parent
  const openDashboard = () => {
    // Dispatch custom event to parent component
    window.dispatchEvent(new CustomEvent('openPoRPDashboard'));
  };

  useEffect(() => {
    let interval;
    if (isActive) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive && !receipt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {isActive ? (
            <FaClock className="text-blue-500 animate-pulse" />
          ) : receipt ? (
            <FaCheckCircle className="text-green-500" />
          ) : (
            <FaExclamationTriangle className="text-yellow-500" />
          )}
          <span className="font-semibold text-sm">
            {isActive ? 'Reading Session Active' : 'Session Completed'}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ×
        </button>
      </div>

      {/* Content */}
      {isActive && (
        <div className="space-y-2">
          <div className="text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Time reading:</span>
              <span className="font-medium">{formatTime(timeElapsed)}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-green-600 font-medium">Tracking</span>
            </div>
          </div>
          
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            <FaBook className="inline mr-1" />
            Your reading behavior is being tracked to earn rewards
          </div>
        </div>
      )}

      {receipt && (
        <div className="space-y-2">
          <div className="text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Session ID:</span>
              <span className="font-mono text-xs">{receipt.receipt_id?.substring(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span>Reading time:</span>
              <span className="font-medium">{formatTime(receipt.top_seconds?.[0] || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Entropy score:</span>
              <span className="font-medium">{(receipt.entropy_score || 0).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
            <FaCheckCircle className="inline mr-1" />
            Reading session verified! Receipt issued.
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-gray-500 hover:text-gray-700 flex-1"
        >
          {showDetails ? 'Hide' : 'Show'} details
        </button>
        <button
          onClick={openDashboard}
          className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
        >
          <FaChartLine size={10} />
          Dashboard
        </button>
      </div>

      {/* Expanded details */}
      {showDetails && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600 space-y-1">
          <p><strong>Proof-of-Reading Protocol</strong></p>
          <p>• Behavioral tracking prevents bots</p>
          <p>• Cryptographic receipts prove genuine reading</p>
          <p>• Earn reputation and unlock better rewards</p>
          {receipt && (
            <p className="text-green-600">• Receipt expires: {new Date(receipt.expires_at).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  );
}
