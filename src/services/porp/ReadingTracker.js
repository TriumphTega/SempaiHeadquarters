/**
 * ReadingTracker - PoRP Layer 1 Behavioral Tracking Service
 * Captures user reading behavior for cryptographic proof-of-reading
 */

class ReadingTracker {
  constructor() {
    this.sessionId = null;
    this.startTime = null;
    this.scrollEvents = [];
    this.interactionEvents = [];
    this.visibilityEvents = [];
    this.deviceHash = null;
    this.isTracking = false;
    this.lastScrollPosition = 0;
    this.scrollDebounceTimer = null;
  }

  /**
   * Initialize a new reading session
   */
  async startSession(novelId, chapterNumber, walletAddress) {
    try {
      // Validate input parameters
      if (!novelId) {
        throw new Error('novelId is required');
      }
      if (chapterNumber === null || chapterNumber === undefined || chapterNumber === '') {
        throw new Error('chapterNumber is required');
      }
      if (!walletAddress) {
        throw new Error('walletAddress is required');
      }
      
      console.log('[ReadingTracker] Starting session:', { novelId, chapterNumber, walletAddress });
      
      // Generate device fingerprint hash
      this.deviceHash = this.generateDeviceHash();
      console.log('[ReadingTracker] Generated device hash:', this.deviceHash);
      
      if (!this.deviceHash) {
        throw new Error('Failed to generate device hash');
      }
      
      // Start session with server
      const requestData = {
        novelId,
        chapterNumber,
        deviceHash: this.deviceHash,
        walletAddress
      };
      
      console.log('[ReadingTracker] Sending session request:', requestData);
      
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('[ReadingTracker] API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        // Handle authentication errors gracefully
        if (response.status === 401) {
          console.warn('[PoRP] User not authenticated, skipping session tracking');
          return null; // Return null instead of throwing
        }
        throw new Error(data.error || 'Failed to start session');
      }

      this.sessionId = data.sessionId;
      this.startTime = Date.now();
      this.isTracking = true;
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log(`[PoRP] Reading session started: ${this.sessionId}`);
      return this.sessionId;
      
    } catch (error) {
      console.error('[PoRP] Failed to start reading session:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for behavioral tracking
   */
  setupEventListeners() {
    if (!this.isTracking) return;

    // Scroll tracking with debouncing
    const scrollHandler = this.debounce((event) => {
      this.handleScroll(event);
    }, 100);

    window.addEventListener('scroll', scrollHandler, { passive: true });
    
    // Interaction tracking
    document.addEventListener('click', this.handleInteraction.bind(this));
    document.addEventListener('keypress', this.handleInteraction.bind(this));
    document.addEventListener('touchstart', this.handleInteraction.bind(this));
    
    // Visibility tracking
    document.addEventListener('visibilitychange', this.handleVisibility.bind(this));
    
    // Page unload handling
    window.addEventListener('beforeunload', this.handlePageUnload.bind(this));
    
    // Focus/blur tracking
    window.addEventListener('focus', this.handleFocus.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));
  }

  /**
   * Handle scroll events
   */
  handleScroll(event) {
    if (!this.isTracking) return;

    const scrollData = {
      timestamp: Date.now() - this.startTime,
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollPercentage: (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    };

    // Only record significant scroll changes (reduced from 50px to 100px for less data)
    if (Math.abs(scrollData.scrollY - this.lastScrollPosition) > 100) {
      this.scrollEvents.push(scrollData);
      this.lastScrollPosition = scrollData.scrollY;
      
      // Limit scroll events to prevent memory bloat
      if (this.scrollEvents.length > 50) {
        this.scrollEvents = this.scrollEvents.slice(-25); // Keep last 25 events
      }
    }
  }

  /**
   * Handle user interactions (clicks, keypresses, touches)
   */
  handleInteraction(event) {
    if (!this.isTracking) return;

    const interactionData = {
      timestamp: Date.now() - this.startTime,
      type: event.type,
      target: {
        tagName: event.target.tagName,
        className: event.target.className,
        id: event.target.id
      },
      position: {
        x: event.clientX || 0,
        y: event.clientY || 0
      },
      scrollPosition: window.scrollY
    };

    this.interactionEvents.push(interactionData);
    
    // Limit interaction events to prevent memory bloat
    if (this.interactionEvents.length > 30) {
      this.interactionEvents = this.interactionEvents.slice(-15); // Keep last 15 events
    }
  }

  /**
   * Handle page visibility changes
   */
  handleVisibility() {
    if (!this.isTracking) return;

    const visibilityData = {
      timestamp: Date.now() - this.startTime,
      hidden: document.hidden,
      visibilityState: document.visibilityState
    };

    this.visibilityEvents.push(visibilityData);
  }

  /**
   * Handle focus events
   */
  handleFocus() {
    if (!this.isTracking) return;
    
    this.interactionEvents.push({
      timestamp: Date.now() - this.startTime,
      type: 'focus',
      target: { tagName: 'window' }
    });
  }

  /**
   * Handle blur events
   */
  handleBlur() {
    if (!this.isTracking) return;
    
    this.interactionEvents.push({
      timestamp: Date.now() - this.startTime,
      type: 'blur',
      target: { tagName: 'window' }
    });
  }

  /**
   * Handle page unload - attempt to complete session
   */
  handlePageUnload() {
    if (this.isTracking && this.sessionId) {
      // Use navigator.sendBeacon for reliable delivery during page unload
      const sessionData = this.getSessionData();
      
      const data = new Blob([JSON.stringify({
        sessionId: this.sessionId,
        sessionData
      })], { type: 'application/json' });
      
      navigator.sendBeacon('/api/session/verify', data);
    }
  }

  /**
   * Calculate entropy score based on behavioral patterns
   */
  calculateEntropy() {
    const scrollEntropy = this.analyzeScrollPattern();
    const interactionEntropy = this.analyzeInteractionPattern();
    const timingEntropy = this.analyzeTimingPattern();
    
    // Weighted average (scroll: 40%, interaction: 40%, timing: 20%)
    const totalEntropy = (scrollEntropy * 0.4) + (interactionEntropy * 0.4) + (timingEntropy * 0.2);
    
    return Math.min(1, Math.max(0, totalEntropy));
  }

  /**
   * Analyze scroll pattern entropy
   */
  analyzeScrollPattern() {
    if (this.scrollEvents.length < 2) return 0;
    
    // Calculate scroll velocities
    const velocities = [];
    for (let i = 1; i < this.scrollEvents.length; i++) {
      const timeDiff = this.scrollEvents[i].timestamp - this.scrollEvents[i-1].timestamp;
      const scrollDiff = this.scrollEvents[i].scrollY - this.scrollEvents[i-1].scrollY;
      if (timeDiff > 0) {
        velocities.push(Math.abs(scrollDiff / timeDiff));
      }
    }
    
    if (velocities.length === 0) return 0;
    
    // Calculate variance in velocities
    const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;
    
    // Normalize variance to 0-1 scale (higher variance = more natural)
    return Math.min(1, variance / 500);
  }

  /**
   * Analyze interaction pattern entropy
   */
  analyzeInteractionPattern() {
    if (this.interactionEvents.length === 0) return 0;
    
    // Calculate time intervals between interactions
    const intervals = [];
    for (let i = 1; i < this.interactionEvents.length; i++) {
      intervals.push(this.interactionEvents[i].timestamp - this.interactionEvents[i-1].timestamp);
    }
    
    if (intervals.length === 0) return 0;
    
    // Calculate entropy based on interval variance
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
    
    // Normalize to 0-1 scale
    return Math.min(1, variance / 10000);
  }

  /**
   * Analyze timing pattern entropy
   */
  analyzeTimingPattern() {
    // Check for regular patterns in interaction timing
    const interactionTypes = {};
    this.interactionEvents.forEach(event => {
      if (!interactionTypes[event.type]) {
        interactionTypes[event.type] = [];
      }
      interactionTypes[event.type].push(event.timestamp);
    });
    
    let totalEntropy = 0;
    let typeCount = 0;
    
    Object.values(interactionTypes).forEach(timestamps => {
      if (timestamps.length > 1) {
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i] - timestamps[i-1]);
        }
        
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
        
        totalEntropy += Math.min(1, variance / 1000);
        typeCount++;
      }
    });
    
    return typeCount > 0 ? totalEntropy / typeCount : 0;
  }

  /**
   * Generate device fingerprint hash
   */
  generateDeviceHash() {
    try {
      // Create canvas fingerprint
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint hash', 2, 2);
      
      const fingerprintData = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        canvas.toDataURL(),
        navigator.hardwareConcurrency || 'unknown',
        navigator.deviceMemory || 'unknown'
      ];
      
      // Create hash from fingerprint data
      const fingerprint = fingerprintData.join('|');
      let hash = 0;
      
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      return Math.abs(hash).toString(16);
    } catch (error) {
      console.error('[PoRP] Device fingerprint generation failed:', error);
      return 'fallback_' + Math.random().toString(36).substring(2, 15);
    }
  }

  /**
   * Get session data for submission
   */
  getSessionData() {
    return {
      timeOnPage: Date.now() - this.startTime,
      scrollEvents: this.scrollEvents,
      interactionEvents: this.interactionEvents,
      visibilityEvents: this.visibilityEvents,
      entropyScore: this.calculateEntropy()
    };
  }

  /**
   * Complete the reading session and get receipt
   */
  async completeSession(walletAddress) {
    if (!this.isTracking || !this.sessionId) {
      throw new Error('No active session to complete');
    }

    try {
      const sessionData = this.getSessionData();
      
      const response = await fetch('/api/session/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          sessionData,
          walletAddress
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Session verification failed');
      }

      console.log(`[PoRP] Session completed: ${this.sessionId}`);
      return data.receipt;
      
    } catch (error) {
      console.error('[PoRP] Failed to complete session:', error);
      throw error;
    } finally {
      this.cleanup();
    }
  }

  /**
   * Cleanup event listeners and reset state
   */
  cleanup() {
    this.isTracking = false;
    this.sessionId = null;
    this.startTime = null;
    this.scrollEvents = [];
    this.interactionEvents = [];
    this.visibilityEvents = [];
    
    // Remove event listeners
    window.removeEventListener('scroll', this.handleScroll);
    document.removeEventListener('click', this.handleInteraction);
    document.removeEventListener('keypress', this.handleInteraction);
    document.removeEventListener('touchstart', this.handleInteraction);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    window.removeEventListener('beforeunload', this.handlePageUnload);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);
    
    if (this.scrollDebounceTimer) {
      clearTimeout(this.scrollDebounceTimer);
    }
  }

  /**
   * Utility: Debounce function for scroll events
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Request a comprehension challenge (12.5% chance)
   */
  async requestChallenge(novelId, chapterNumber) {
    try {
      if (!this.sessionId) {
        throw new Error('No active session');
      }

      console.log('[ReadingTracker] Requesting challenge for novel:', novelId, 'chapter:', chapterNumber);

      const response = await fetch('/api/challenge/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          novelId,
          chapterNumber
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get challenge');
      }

      return data.challenge; // Can be null if no challenge this time
      
    } catch (error) {
      console.error('[ReadingTracker] Failed to request challenge:', error);
      return null;
    }
  }

  /**
   * Submit challenge answer
   */
  async submitChallengeAnswer(challengeId, userAnswer, responseTime) {
    try {
      if (!this.sessionId) {
        throw new Error('No active session');
      }

      console.log('[ReadingTracker] Submitting challenge answer:', { challengeId, userAnswer, responseTime });

      const response = await fetch('/api/challenge/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          challengeId,
          userAnswer,
          responseTime
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit challenge');
      }

      console.log('[ReadingTracker] Challenge result:', data);
      return data;
      
    } catch (error) {
      console.error('[ReadingTracker] Failed to submit challenge answer:', error);
      throw error;
    }
  }

  /**
   * Complete session with optional challenge
   */
  async completeSessionWithChallenge(novelId, chapterNumber, walletAddress) {
    try {
      // First, request a challenge
      const challenge = await this.requestChallenge(novelId, chapterNumber);
      
      if (challenge) {
        console.log('[ReadingTracker] Challenge required, returning challenge data');
        return {
          requiresChallenge: true,
          challenge: challenge,
          sessionId: this.sessionId
        };
      }
      
      // No challenge required, complete session normally
      const receipt = await this.completeSession(walletAddress);
      return {
        requiresChallenge: false,
        receipt: receipt
      };
      
    } catch (error) {
      console.error('[ReadingTracker] Failed to complete session with challenge:', error);
      throw error;
    }
  }

  /**
   * Get current session status
   */
  getStatus() {
    return {
      isTracking: this.isTracking,
      sessionId: this.sessionId,
      startTime: this.startTime,
      scrollEventsCount: this.scrollEvents.length,
      interactionEventsCount: this.interactionEvents.length,
      currentEntropy: this.calculateEntropy()
    };
  }
}

export default ReadingTracker;
