/**
 * PoRP Layer 3 - Withdrawal Reputation Service
 * 
 * This service manages withdrawal restrictions based on reading reputation
 * and implements anti-dump mechanisms to protect the ecosystem.
 */

class WithdrawalReputationService {
  constructor() {
    this.reputationTiers = {
      'seed': {
        minScore: 0,
        maxWithdrawalUSD: 50,
        cooldownHours: 24,
        description: 'New reader - Basic withdrawal limits'
      },
      'reader': {
        minScore: 100,
        maxWithdrawalUSD: 200,
        cooldownHours: 12,
        description: 'Active reader - Moderate withdrawal limits'
      },
      'scholar': {
        minScore: 500,
        maxWithdrawalUSD: 1000,
        cooldownHours: 6,
        description: 'Dedicated reader - High withdrawal limits'
      },
      'master': {
        minScore: 1000,
        maxWithdrawalUSD: 5000,
        cooldownHours: 2,
        description: 'Expert reader - Premium withdrawal limits'
      }
    };
  }

  /**
   * Get user's current reputation tier and withdrawal limits
   */
  async getUserReputationTier(walletAddress) {
    try {
      console.log('[WithdrawalReputation] Getting reputation for:', walletAddress);
      
      // For now, return default tier since database isn't set up
      // In production, this would query the reading_reputation table
      const userReputation = await this.fetchUserReputation(walletAddress);
      
      const tier = this.determineReputationTier(userReputation);
      
      console.log('[WithdrawalReputation] User tier:', tier.name, 'Score:', userReputation.score);
      
      return {
        tier: tier.name,
        score: userReputation.score,
        limits: tier,
        canWithdraw: true
      };
      
    } catch (error) {
      console.error('[WithdrawalReputation] Error getting user reputation:', error);
      // Default to seed tier on error
      return {
        tier: 'seed',
        score: 0,
        limits: this.reputationTiers.seed,
        canWithdraw: true
      };
    }
  }

  /**
   * Check if a withdrawal amount is allowed based on reputation
   */
  async checkWithdrawalEligibility(walletAddress, amountUSD, tokenSymbol) {
    try {
      console.log('[WithdrawalReputation] Checking eligibility:', { walletAddress, amountUSD, tokenSymbol });
      
      const reputationInfo = await this.getUserReputationTier(walletAddress);
      
      // Check if amount exceeds daily limit
      if (amountUSD > reputationInfo.limits.maxWithdrawalUSD) {
        return {
          canWithdraw: false,
          reason: `Amount $${amountUSD.toFixed(2)} exceeds daily limit of $${reputationInfo.limits.maxWithdrawalUSD} for ${reputationInfo.tier} tier`,
          tier: reputationInfo.tier,
          maxAmount: reputationInfo.limits.maxWithdrawalUSD,
          requiredScore: this.getNextTierRequirement(reputationInfo.tier).minScore
        };
      }

      // Check cooldown period
      const lastWithdrawal = await this.getLastWithdrawal(walletAddress);
      if (lastWithdrawal) {
        const cooldownEnd = new Date(lastWithdrawal.getTime() + reputationInfo.limits.cooldownHours * 60 * 60 * 1000);
        if (new Date() < cooldownEnd) {
          const remainingHours = Math.ceil((cooldownEnd - new Date()) / (1000 * 60 * 60));
          return {
            canWithdraw: false,
            reason: `Withdrawal cooldown active. ${remainingHours} hours remaining.`,
            tier: reputationInfo.tier,
            cooldownEnd: cooldownEnd,
            maxAmount: reputationInfo.limits.maxWithdrawalUSD
          };
        }
      }

      return {
        canWithdraw: true,
        tier: reputationInfo.tier,
        score: reputationInfo.score,
        maxAmount: reputationInfo.limits.maxWithdrawalUSD,
        message: `Withdrawal approved. ${reputationInfo.limits.description}`
      };
      
    } catch (error) {
      console.error('[WithdrawalReputation] Error checking eligibility:', error);
      return {
        canWithdraw: false,
        reason: 'Unable to verify withdrawal eligibility',
        error: error.message
      };
    }
  }

  /**
   * Convert token amount to USD value
   */
  async convertTokenToUSD(tokenSymbol, amount) {
    try {
      console.log('[WithdrawalReputation] Converting token to USD:', { tokenSymbol, amount });
      
      // Get current token prices (you can integrate with your existing price fetching)
      const prices = await this.getTokenPrices();
      
      const price = prices[tokenSymbol.toUpperCase()];
      if (!price) {
        throw new Error(`Price not available for ${tokenSymbol}`);
      }
      
      const usdValue = amount * price;
      console.log('[WithdrawalReputation] Conversion result:', { amount, tokenSymbol, price, usdValue });
      
      return usdValue;
      
    } catch (error) {
      console.error('[WithdrawalReputation] Error converting token to USD:', error);
      throw error;
    }
  }

  /**
   * Record a withdrawal for cooldown tracking
   */
  async recordWithdrawal(walletAddress, amountUSD, tokenSymbol, txHash) {
    try {
      console.log('[WithdrawalReputation] Recording withdrawal:', { walletAddress, amountUSD, tokenSymbol, txHash });
      
      // In production, this would store in a withdrawal_history table
      // For now, just log the transaction
      const withdrawal = {
        walletAddress,
        amountUSD,
        tokenSymbol,
        txHash,
        timestamp: new Date().toISOString()
      };
      
      console.log('[WithdrawalReputation] Withdrawal recorded:', withdrawal);
      
      return withdrawal;
      
    } catch (error) {
      console.error('[WithdrawalReputation] Error recording withdrawal:', error);
      throw error;
    }
  }

  // Private helper methods

  determineReputationTier(userReputation) {
    const score = userReputation.score || 0;
    
    for (const [tierName, tierConfig] of Object.entries(this.reputationTiers)) {
      if (score >= tierConfig.minScore) {
        return { name: tierName, ...tierConfig };
      }
    }
    
    return { name: 'seed', ...this.reputationTiers.seed };
  }

  getNextTierRequirement(currentTier) {
    const tiers = ['seed', 'reader', 'scholar', 'master'];
    const currentIndex = tiers.indexOf(currentTier);
    
    if (currentIndex < tiers.length - 1) {
      const nextTier = tiers[currentIndex + 1];
      return this.reputationTiers[nextTier];
    }
    
    return this.reputationTiers[currentTier]; // Already at max tier
  }

  async fetchUserReputation(walletAddress) {
    // For now, return a default reputation
    // In production, this would query:
    // SELECT * FROM reading_reputation WHERE wallet_address = ?
    
    // Simulate different reputation levels for testing
    const testScores = {
      'A6jwr4omFrFhLKrjc2fi9djmt6kay2iKt4oQytNKaBsN': 750, // Scholar tier
    };
    
    return {
      score: testScores[walletAddress] || 25, // Default to seed tier
      walletAddress,
      lastUpdated: new Date().toISOString()
    };
  }

  async getLastWithdrawal(walletAddress) {
    // For now, return null (no previous withdrawal)
    // In production, this would query withdrawal_history table
    return null;
  }

  async getTokenPrices() {
    try {
      // You can integrate with your existing price fetching system
      // For now, return some common prices
      
      // Try to fetch from your existing price system
      const response = await fetch('/api/prices');
      if (response.ok) {
        const prices = await response.json();
        return prices;
      }
      
      // Fallback prices
      return {
        'SOL': 150,
        'SMP': 0.01,
        'USDC': 1.0,
        'USDT': 1.0
      };
      
    } catch (error) {
      console.error('[WithdrawalReputation] Error fetching prices:', error);
      // Return fallback prices
      return {
        'SOL': 150,
        'SMP': 0.01,
        'USDC': 1.0,
        'USDT': 1.0
      };
    }
  }
}

export default WithdrawalReputationService;
