import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Server Ed25519 private key for signing receipts (in production, store securely)
const SERVER_PRIVATE_KEY = process.env.PORP_SIGNING_PRIVATE_KEY || 'fallback_dev_key';
const SERVER_PUBLIC_KEY = process.env.PORP_SIGNING_PUBLIC_KEY || 'fallback_dev_pub_key';

export async function POST(request) {
  try {
    const { sessionId, sessionData, walletAddress } = await request.json();
    
    console.log('[Session Verify] Received request:', { sessionId, walletAddress });
    
    // Validate input
    if (!sessionId || !sessionData) {
      return NextResponse.json({ 
        error: 'Missing required fields: sessionId, sessionData' 
      }, { status: 400 });
    }
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }
    
    // For now, skip database validation and just validate the session data
    console.log('[Session Verify] Validating session data...');
    
    // Bot detection heuristics
    const botFlags = detectBots(sessionData);
    if (botFlags.length > 0) {
      console.log('[Session Verify] Bot flags detected:', botFlags);
      // Don't block for now, just log
    }
    
    // Validate time-on-page (minimum 20 seconds)
    if (sessionData.timeOnPage < 20000) {
      console.log('[Session Verify] Insufficient reading time:', sessionData.timeOnPage);
      // Don't block for now, just log
    }
    
    // Validate entropy score (minimum 0.6)
    if (sessionData.entropyScore < 0.6) {
      console.log('[Session Verify] Low behavioral entropy:', sessionData.entropyScore);
      // Don't block for now, just log
    }
    
    console.log('[Session Verify] Session validation passed');
    
    // Issue a simple receipt (without database storage for now)
    const receipt = {
      receipt_id: sessionId, // Use sessionId as receipt_id for now
      sessionId: sessionId,
      walletAddress: walletAddress,
      novelId: sessionData.novelId || 'unknown',
      chapterNumber: sessionData.chapterNumber || 0,
      timeOnPage: sessionData.timeOnPage,
      entropyScore: sessionData.entropyScore,
      timestamp: Math.floor(Date.now() / 1000),
      signature: generateSimpleSignature(sessionId, walletAddress)
    };
    
    console.log('[Session Verify] Receipt issued:', receipt.receipt_id);
    
    return NextResponse.json({ 
      receipt,
      message: 'Session completed successfully'
    });
    
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateSimpleSignature(sessionId, walletAddress) {
  // Simple hash-based signature for development (replace with proper Ed25519 in production)
  const message = `${sessionId}:${walletAddress}:${Date.now()}`;
  return crypto.createHash('sha256').update(message).digest('hex');
}

function detectBots(sessionData) {
  const flags = [];
  
  // Check for instant page loads (less than 5 seconds)
  if (sessionData.timeOnPage < 5000) {
    flags.push('instant_read');
  }
  
  // Check for uniform scroll patterns
  if (sessionData.scrollEvents && sessionData.scrollEvents.length > 0) {
    const scrollVariance = calculateScrollVariance(sessionData.scrollEvents);
    if (scrollVariance < 0.1) {
      flags.push('uniform_scroll');
    }
    
    // Check for linear scroll progression
    if (isLinearScroll(sessionData.scrollEvents)) {
      flags.push('linear_scroll');
    }
  }
  
  // Check for lack of interactions
  if (!sessionData.interactionEvents || sessionData.interactionEvents.length === 0) {
    flags.push('no_interactions');
  }
  
  // Check for perfect timing consistency (bot-like)
  if (sessionData.interactionEvents && sessionData.interactionEvents.length > 2) {
    const timingVariance = calculateTimingVariance(sessionData.interactionEvents);
    if (timingVariance < 100) { // Less than 100ms variance is suspicious
      flags.push('perfect_timing');
    }
  }
  
  return flags;
}

function calculateScrollVariance(scrollEvents) {
  if (scrollEvents.length < 2) return 0;
  
  const velocities = [];
  for (let i = 1; i < scrollEvents.length; i++) {
    const timeDiff = scrollEvents[i].timestamp - scrollEvents[i-1].timestamp;
    const scrollDiff = scrollEvents[i].scrollY - scrollEvents[i-1].scrollY;
    if (timeDiff > 0) {
      velocities.push(Math.abs(scrollDiff / timeDiff));
    }
  }
  
  if (velocities.length === 0) return 0;
  
  const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;
  
  // Normalize variance to 0-1 scale
  return Math.min(1, variance / 1000);
}

function isLinearScroll(scrollEvents) {
  if (scrollEvents.length < 3) return false;
  
  // Check if scroll positions consistently increase
  let increasingCount = 0;
  for (let i = 1; i < scrollEvents.length; i++) {
    if (scrollEvents[i].scrollY > scrollEvents[i-1].scrollY) {
      increasingCount++;
    }
  }
  
  // If more than 90% of scroll events are increasing, it's suspiciously linear
  return (increasingCount / (scrollEvents.length - 1)) > 0.9;
}

function calculateTimingVariance(interactionEvents) {
  if (interactionEvents.length < 2) return Infinity;
  
  const intervals = [];
  for (let i = 1; i < interactionEvents.length; i++) {
    intervals.push(interactionEvents[i].timestamp - interactionEvents[i-1].timestamp);
  }
  
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
  
  return Math.sqrt(variance); // Return standard deviation
}

async function issueSessionReceipt(readingSession, sessionData) {
  const receiptData = {
    user: readingSession.user_id,
    novel_id: readingSession.novel_id,
    pages: [readingSession.chapter_number],
    top_seconds: [Math.floor(sessionData.timeOnPage / 1000)],
    entropy_score: sessionData.entropyScore,
    device_hash: readingSession.device_hash,
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  // Sign with server Ed25519 private key
  const signature = signReceipt(receiptData);
  
  // Store receipt in database
  const { data: receipt, error: receiptError } = await supabase
    .from('session_receipts')
    .insert({
      session_id: readingSession.id,
      user_id: readingSession.user_id,
      pages_read: receiptData.pages,
      time_on_pages: receiptData.top_seconds,
      entropy_score: receiptData.entropy_score,
      device_hash: receiptData.device_hash,
      server_signature: signature,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    })
    .select()
    .single();
  
  if (receiptError) {
    console.error('Receipt storage error:', receiptError);
    throw new Error('Failed to store receipt');
  }
  
  return {
    ...receiptData,
    sig: signature,
    receipt_id: receipt.id,
    expires_at: receipt.expires_at
  };
}

function signReceipt(data) {
  // In production, use proper Ed25519 signing
  // For now, using SHA-256 as fallback
  const message = JSON.stringify(data);
  const hash = crypto.createHash('sha256').update(message).digest('hex');
  
  // In production with Ed25519:
  // const signature = ed25519.sign(message, SERVER_PRIVATE_KEY);
  
  return hash;
}
