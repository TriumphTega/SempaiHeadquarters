"use client";

import { useState, useEffect } from 'react';
import './LoadingPage.css'; // Import the CSS file for styling

export default function LoadingPage() {
  const [loading, setLoading] = useState(true);

  // Simulate a delay to mimic page loading (can be removed in production)
  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 3000); // Loading page will disappear after 3 seconds (adjust as needed)
  }, []);

  return (
    <div className={loading ? 'loading-container' : 'loading-container hidden'}>
      <div className="spinner">
        <img src="images/logo.jpg" alt="Logo" className="logo" />
      </div>
      <h6 className="loading-text">Loading...</h6>
    </div>
  );
}
