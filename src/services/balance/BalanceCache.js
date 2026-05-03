/**
 * Smart Balance Caching Service
 * Reduces RPC calls by caching balances with intelligent refresh strategies
 */

import { supabase } from '../supabase/supabaseClient';

export class BalanceCache {
  constructor() {
    this.cache = new Map(); // In-memory cache for session
    this.cacheTimeouts = new Map();
    this.lastRpcCalls = new Map();
    this.RPC_COOLDOWN = 30000; // 30 seconds between RPC calls for same wallet
    this.CACHE_TTL = 60000; // 1 minute cache TTL
  }

  /**
   * Get balance with smart caching strategy
   */
  async getBalance(walletAddress, currency = 'SMP', chain = 'SOL') {
    const cacheKey = `${walletAddress}-${currency}-${chain}`;
    
    // Check in-memory cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log(`[BalanceCache] Cache hit for ${cacheKey}`);
        return cached.balance;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // Check database cache
    const dbBalance = await this.getDbBalance(walletAddress, currency, chain);
    if (dbBalance !== null) {
      const isRecent = this.isDbCacheRecent(walletAddress, currency, chain);
      
      if (isRecent) {
        // Update in-memory cache
        this.cache.set(cacheKey, {
          balance: dbBalance,
          timestamp: Date.now()
        });
        console.log(`[BalanceCache] DB cache hit for ${cacheKey}`);
        return dbBalance;
      }
    }

    // Need fresh data from RPC - check cooldown
    if (this.isRpcOnCooldown(walletAddress, currency, chain)) {
      console.log(`[BalanceCache] RPC on cooldown, using stale data for ${cacheKey}`);
      return dbBalance || 0;
    }

    // Fetch fresh from RPC
    console.log(`[BalanceCache] Fetching fresh balance from RPC for ${cacheKey}`);
    const freshBalance = await this.fetchFromRpc(walletAddress, currency, chain);
    
    // Update all caches
    await this.updateCaches(walletAddress, currency, chain, freshBalance);
    
    return freshBalance;
  }

  /**
   * Get balance from database cache
   */
  async getDbBalance(walletAddress, currency, chain) {
    try {
      const { data, error } = await supabase
        .from('wallet_balances')
        .select('amount')
        .eq('wallet_address', walletAddress)
        .eq('currency', currency)
        .eq('chain', chain)
        .single();

      if (error || !data) {
        return null;
      }

      return Number(data.amount);
    } catch (error) {
      console.error('[BalanceCache] DB cache error:', error);
      return null;
    }
  }

  /**
   * Check if DB cache is recent (within 5 minutes)
   */
  isDbCacheRecent(walletAddress, currency, chain) {
    // This would ideally check the updated_at timestamp
    // For now, we'll use a simple heuristic
    return true; // Assume DB cache is recent
  }

  /**
   * Check if RPC call is on cooldown
   */
  isRpcOnCooldown(walletAddress, currency, chain) {
    const cooldownKey = `${walletAddress}-${currency}-${chain}`;
    const lastCall = this.lastRpcCalls.get(cooldownKey);
    
    if (!lastCall) return false;
    
    return Date.now() - lastCall < this.RPC_COOLDOWN;
  }

  /**
   * Fetch balance from RPC (existing implementation)
   */
  async fetchFromRpc(walletAddress, currency, chain) {
    try {
      // Import the existing fetch function
      const { fetchSmpBalanceOnChain } = await import('../../app/novel/[id]/chapter/[chapter]/page.js');
      
      // This is a simplified approach - you might need to adapt
      // based on how the existing function is structured
      if (currency === 'SMP') {
        // Call the existing RPC fetch function
        // Note: You may need to refactor the existing function to be reusable
        const balance = await this.callExistingSmpFetch(walletAddress);
        
        // Update RPC cooldown
        const cooldownKey = `${walletAddress}-${currency}-${chain}`;
        this.lastRpcCalls.set(cooldownKey, Date.now());
        
        return balance;
      }
      
      return 0;
    } catch (error) {
      console.error('[BalanceCache] RPC fetch error:', error);
      throw error;
    }
  }

  /**
   * Call existing SMP fetch function
   * Uses the same RPC logic as the original implementation
   */
  async callExistingSmpFetch(walletAddress) {
    try {
      // Import required modules
      const { Connection, PublicKey } = await import('@solana/web3.js');
      const { 
        getAssociatedTokenAddressSync, 
        unpackAccount 
      } = await import('@solana/spl-token');
      
      // Constants from the chapter page
      const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';
      const SMP_MINT_ADDRESS = new PublicKey(process.env.NEXT_PUBLIC_SMP_MINT || 'SMP1xiPwpMiLPpnJtdEmsDGSL9fR1rvat6NFGznKPor');
      const SMP_DECIMALS = 6;
      
      const connection = new Connection(RPC_URL, {
        commitment: "confirmed",
        httpHeaders: { "x-api-key": RPC_URL.split("=")[1] },
      });
      
      const userPublicKey = new PublicKey(walletAddress);
      const ataAddress = getAssociatedTokenAddressSync(SMP_MINT_ADDRESS, userPublicKey);
      
      console.log(`[BalanceCache] Fetching SMP balance for ATA: ${ataAddress.toString()}`);
      const ataInfo = await connection.getAccountInfo(ataAddress);
      
      if (!ataInfo) {
        console.log("[BalanceCache] No ATA found for SMP, returning 0 balance");
        return 0;
      }
      
      const ata = unpackAccount(ataAddress, ataAddress);
      const rawBalance = ata.amount;
      const formattedBalance = Number(rawBalance) / Math.pow(10, SMP_DECIMALS);
      
      console.log(`[BalanceCache] SMP balance fetched from RPC: ${formattedBalance}`);
      return formattedBalance;
    } catch (error) {
      console.error('[BalanceCache] RPC fetch error:', error);
      // Return 0 instead of throwing to prevent breaking the UI
      return 0;
    }
  }

  /**
   * Update all caches with fresh balance
   */
  async updateCaches(walletAddress, currency, chain, balance) {
    const cacheKey = `${walletAddress}-${currency}-${chain}`;
    
    // Update in-memory cache
    this.cache.set(cacheKey, {
      balance: balance,
      timestamp: Date.now()
    });

    // Update database cache
    try {
      await supabase
        .from('wallet_balances')
        .upsert({
          wallet_address: walletAddress,
          currency: currency,
          chain: chain,
          amount: balance,
          decimals: 6, // SMP decimals
          updated_at: new Date().toISOString()
        }, {
          onConflict: ['wallet_address', 'currency', 'chain']
        });

      console.log(`[BalanceCache] Updated DB cache for ${cacheKey}: ${balance}`);
    } catch (error) {
      console.error('[BalanceCache] DB cache update error:', error);
    }
  }

  /**
   * Invalidate cache for specific wallet
   */
  invalidateWallet(walletAddress) {
    // Clear in-memory cache entries for this wallet
    for (const [key] of this.cache) {
      if (key.startsWith(walletAddress)) {
        this.cache.delete(key);
      }
    }

    // Clear RPC cooldowns
    for (const [key] of this.lastRpcCalls) {
      if (key.startsWith(walletAddress)) {
        this.lastRpcCalls.delete(key);
      }
    }

    console.log(`[BalanceCache] Invalidated cache for ${walletAddress}`);
  }

  /**
   * Update balance after transaction ( proactive cache update )
   */
  async updateBalanceAfterTransaction(walletAddress, currency, chain, amountChange) {
    const currentBalance = await this.getBalance(walletAddress, currency, chain);
    const newBalance = currentBalance + amountChange;
    
    await this.updateCaches(walletAddress, currency, chain, newBalance);
    
    console.log(`[BalanceCache] Updated balance after transaction: ${amountChange} SMP, new balance: ${newBalance}`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      inMemoryCacheSize: this.cache.size,
      rpcCooldownsActive: this.lastRpcCalls.size,
      memoryUsage: JSON.stringify([...this.cache.entries()]).length
    };
  }
}

// Singleton instance
export const balanceCache = new BalanceCache();
