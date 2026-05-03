/**
 * Optimized Balance Cache - Reduces RPC calls by caching balance data
 */

class OptimizedBalanceCache {
  constructor(ttl = 30000) { // 30 seconds default TTL
    this.cache = new Map();
    this.ttl = ttl;
    this.connection = null;
    this.rpcUsageTracker = new Map();
  }

  setConnection(connection) {
    this.connection = connection;
  }

  /**
   * Track RPC usage to prevent draining
   */
  trackRPCUsage(method) {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${method}-${minute}`;
    
    const current = this.rpcUsageTracker.get(key) || 0;
    this.rpcUsageTracker.set(key, current + 1);
    
    // Define limits per minute
    const limits = {
      'getBalance': 100,
      'getAccountInfo': 50,
      'getLatestBlockhash': 30,
      'confirmTransaction': 20
    };
    
    if (current > (limits[method] || 50)) {
      console.warn(`[BalanceCache] RPC usage limit exceeded for ${method}: ${current}/${limits[method]}`);
      return false;
    }
    
    return true;
  }

  /**
   * Get cached balance or fetch from RPC
   */
  async getBalance(address, tokenSymbol, mintAddress) {
    if (!this.connection) {
      throw new Error('Connection not set. Call setConnection() first.');
    }

    const cacheKey = `${address}-${tokenSymbol}`;
    const cached = this.cache.get(cacheKey);
    
    // Check cache first
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log(`[BalanceCache] Cache hit for ${tokenSymbol}:`, cached.balance);
      return cached.balance;
    }
    
    // Fetch fresh balance
    console.log(`[BalanceCache] Cache miss, fetching ${tokenSymbol} balance for:`, address);
    const balance = await this.fetchBalanceFromRPC(address, tokenSymbol, mintAddress);
    
    // Cache the result
    this.cache.set(cacheKey, {
      balance,
      timestamp: Date.now(),
      tokenSymbol,
      address
    });
    
    return balance;
  }

  /**
   * Fetch balance from RPC with usage tracking
   */
  async fetchBalanceFromRPC(address, tokenSymbol, mintAddress) {
    try {
      if (tokenSymbol === 'SOL') {
        if (!this.trackRPCUsage('getBalance')) {
          throw new Error('RPC rate limit exceeded for getBalance');
        }
        
        const balanceLamports = await this.connection.getBalance(address);
        return balanceLamports / 1_000_000_000;
      } else {
        if (!this.trackRPCUsage('getAccountInfo')) {
          throw new Error('RPC rate limit exceeded for getAccountInfo');
        }
        
        const { getAssociatedTokenAddressSync, getAccount } = await import('@solana/spl-token');
        const ataAddress = getAssociatedTokenAddressSync(mintAddress, address);
        
        const accountInfo = await this.connection.getAccountInfo(ataAddress);
        if (accountInfo) {
          const account = await getAccount(this.connection, ataAddress);
          return Number(account.amount) / Math.pow(10, account.decimals);
        }
        
        return 0;
      }
    } catch (error) {
      console.error(`[BalanceCache] Error fetching ${tokenSymbol} balance:`, error);
      throw error;
    }
  }

  /**
   * Batch fetch multiple balances
   */
  async getMultipleBalances(requests) {
    if (!this.connection) {
      throw new Error('Connection not set. Call setConnection() first.');
    }

    const results = new Map();
    const uncachedRequests = [];
    
    // Check cache for each request
    for (const { address, tokenSymbol, mintAddress } of requests) {
      const cacheKey = `${address}-${tokenSymbol}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.ttl) {
        results.set(cacheKey, cached.balance);
      } else {
        uncachedRequests.push({ address, tokenSymbol, mintAddress, cacheKey });
      }
    }
    
    // Batch fetch uncached balances
    if (uncachedRequests.length > 0) {
      await this.batchFetchBalances(uncachedRequests, results);
    }
    
    return results;
  }

  /**
   * Batch fetch balances from RPC
   */
  async batchFetchBalances(requests, results) {
    try {
      // Group by token type for efficient batching
      const solRequests = [];
      const tokenRequests = [];
      
      for (const request of requests) {
        if (request.tokenSymbol === 'SOL') {
          solRequests.push(request);
        } else {
          tokenRequests.push(request);
        }
      }
      
      // Fetch SOL balances
      if (solRequests.length > 0) {
        if (!this.trackRPCUsage('getBalance')) {
          throw new Error('RPC rate limit exceeded for getBalance');
        }
        
        for (const request of solRequests) {
          try {
            const balanceLamports = await this.connection.getBalance(request.address);
            const balance = balanceLamports / 1_000_000_000;
            results.set(request.cacheKey, balance);
            
            // Cache result
            this.cache.set(request.cacheKey, {
              balance,
              timestamp: Date.now(),
              tokenSymbol: request.tokenSymbol,
              address: request.address
            });
          } catch (error) {
            console.error(`[BalanceCache] Error fetching SOL for ${request.address}:`, error);
            results.set(request.cacheKey, 0);
          }
        }
      }
      
      // Fetch token balances in batch
      if (tokenRequests.length > 0) {
        if (!this.trackRPCUsage('getAccountInfo')) {
          throw new Error('RPC rate limit exceeded for getAccountInfo');
        }
        
        const { getAssociatedTokenAddressSync, getAccount } = await import('@solana/spl-token');
        
        // Get all ATA addresses
        const ataAddresses = tokenRequests.map(req => 
          getAssociatedTokenAddressSync(req.mintAddress, req.address)
        );
        
        // Batch fetch account infos
        const accountInfos = await this.connection.getMultipleAccountsInfo(ataAddresses);
        
        for (let i = 0; i < tokenRequests.length; i++) {
          const request = tokenRequests[i];
          const accountInfo = accountInfos[i];
          
          try {
            if (accountInfo) {
              const ata = await getAccount(this.connection, ataAddresses[i]);
              const balance = Number(ata.amount) / Math.pow(10, ata.decimals);
              results.set(request.cacheKey, balance);
              
              // Cache result
              this.cache.set(request.cacheKey, {
                balance,
                timestamp: Date.now(),
                tokenSymbol: request.tokenSymbol,
                address: request.address
              });
            } else {
              results.set(request.cacheKey, 0);
            }
          } catch (error) {
            console.error(`[BalanceCache] Error fetching ${request.tokenSymbol} for ${request.address}:`, error);
            results.set(request.cacheKey, 0);
          }
        }
      }
      
    } catch (error) {
      console.error('[BalanceCache] Error in batch fetch:', error);
      throw error;
    }
  }

  /**
   * Clear cache for specific address
   */
  clearCacheForAddress(address) {
    for (const [key, value] of this.cache.entries()) {
      if (value.address === address) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredEntries() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp < this.ttl) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheHitRatio: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
      rpcUsage: Object.fromEntries(this.rpcUsageTracker)
    };
  }

  /**
   * Clear all cache
   */
  clearAll() {
    this.cache.clear();
    this.rpcUsageTracker.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// Create singleton instance
const optimizedBalanceCache = new OptimizedBalanceCache(30000); // 30 seconds TTL
export default optimizedBalanceCache;
