/**
 * Balance Update Service
 * Proactively updates cached balances after transactions to prevent RPC calls
 */

import { balanceCache } from './BalanceCache';
import { supabase } from '../supabase/supabaseClient';

export class BalanceUpdater {
  /**
   * Update balance after chapter payment
   */
  async updateAfterChapterPayment(walletAddress, paymentAmount, currency = 'SMP') {
    try {
      // Deduct payment amount from cached balance
      await balanceCache.updateBalanceAfterTransaction(
        walletAddress, 
        currency, 
        'SOL', 
        -paymentAmount
      );

      console.log(`[BalanceUpdater] Updated balance after chapter payment: -${paymentAmount} SMP`);
    } catch (error) {
      console.error('[BalanceUpdater] Chapter payment update failed:', error);
    }
  }

  /**
   * Update balance after withdrawal
   */
  async updateAfterWithdrawal(walletAddress, withdrawalAmount, currency = 'SMP') {
    try {
      await balanceCache.updateBalanceAfterTransaction(
        walletAddress, 
        currency, 
        'SOL', 
        -withdrawalAmount
      );

      console.log(`[BalanceUpdater] Updated balance after withdrawal: -${withdrawalAmount} SMP`);
    } catch (error) {
      console.error('[BalanceUpdater] Withdrawal update failed:', error);
    }
  }

  /**
   * Update balance after reward claim
   */
  async updateAfterRewardClaim(walletAddress, rewardAmount, currency = 'SMP') {
    try {
      await balanceCache.updateBalanceAfterTransaction(
        walletAddress, 
        currency, 
        'SOL', 
        rewardAmount
      );

      console.log(`[BalanceUpdater] Updated balance after reward claim: +${rewardAmount} SMP`);
    } catch (error) {
      console.error('[BalanceUpdater] Reward claim update failed:', error);
    }
  }

  /**
   * Update balance after staking
   */
  async updateAfterStaking(walletAddress, stakeAmount, currency = 'SMP') {
    try {
      // Update main balance (deduct staked amount)
      await balanceCache.updateBalanceAfterTransaction(
        walletAddress, 
        currency, 
        'SOL', 
        -stakeAmount
      );

      // Update staked amount in database
      await supabase
        .from('wallet_balances')
        .update({ 
          staked_amount: supabase.rpc('coalesce', ['staked_amount', 0], '+', stakeAmount)
        })
        .eq('wallet_address', walletAddress)
        .eq('currency', currency)
        .eq('chain', 'SOL');

      console.log(`[BalanceUpdater] Updated balance after staking: -${stakeAmount} SMP (staked)`);
    } catch (error) {
      console.error('[BalanceUpdater] Staking update failed:', error);
    }
  }

  /**
   * Update balance after unstaking
   */
  async updateAfterUnstaking(walletAddress, unstakeAmount, currency = 'SMP') {
    try {
      // Update main balance (add unstaked amount)
      await balanceCache.updateBalanceAfterTransaction(
        walletAddress, 
        currency, 
        'SOL', 
        unstakeAmount
      );

      // Update staked amount in database
      await supabase
        .from('wallet_balances')
        .update({ 
          staked_amount: supabase.rpc('coalesce', ['staked_amount', 0], '-', unstakeAmount)
        })
        .eq('wallet_address', walletAddress)
        .eq('currency', currency)
        .eq('chain', 'SOL');

      console.log(`[BalanceUpdater] Updated balance after unstaking: +${unstakeAmount} SMP (unstaked)`);
    } catch (error) {
      console.error('[BalanceUpdater] Unstaking update failed:', error);
    }
  }

  /**
   * Update balance after slashing
   */
  async updateAfterSlashing(walletAddress, slashAmount, currency = 'SMP') {
    try {
      await balanceCache.updateBalanceAfterTransaction(
        walletAddress, 
        currency, 
        'SOL', 
        -slashAmount
      );

      console.log(`[BalanceUpdater] Updated balance after slashing: -${slashAmount} SMP`);
    } catch (error) {
      console.error('[BalanceUpdater] Slashing update failed:', error);
    }
  }

  /**
   * Force refresh balance from RPC (use when cache might be stale)
   */
  async forceRefreshBalance(walletAddress, currency = 'SMP', chain = 'SOL') {
    try {
      // Invalidate cache for this wallet
      balanceCache.invalidateWallet(walletAddress);
      
      // Fetch fresh balance
      const freshBalance = await balanceCache.getBalance(walletAddress, currency, chain);
      
      console.log(`[BalanceUpdater] Force refreshed balance: ${freshBalance} SMP`);
      return freshBalance;
    } catch (error) {
      console.error('[BalanceUpdater] Force refresh failed:', error);
      throw error;
    }
  }

  /**
   * Batch update multiple balances (useful for bulk operations)
   */
  async batchUpdateBalance(updates) {
    // updates: [{ walletAddress, amountChange, currency, chain }]
    
    try {
      for (const update of updates) {
        await balanceCache.updateBalanceAfterTransaction(
          update.walletAddress,
          update.currency || 'SMP',
          update.chain || 'SOL',
          update.amountChange
        );
      }

      console.log(`[BalanceUpdater] Batch updated ${updates.length} balances`);
    } catch (error) {
      console.error('[BalanceUpdater] Batch update failed:', error);
    }
  }

  /**
   * Sync balance with blockchain (periodic maintenance)
   */
  async syncWithBlockchain(walletAddress, currency = 'SMP', chain = 'SOL') {
    try {
      // Force refresh from RPC
      const onChainBalance = await this.forceRefreshBalance(walletAddress, currency, chain);
      
      // Update database cache
      await supabase
        .from('wallet_balances')
        .upsert({
          wallet_address: walletAddress,
          currency: currency,
          chain: chain,
          amount: onChainBalance,
          decimals: 6,
          updated_at: new Date().toISOString()
        }, {
          onConflict: ['wallet_address', 'currency', 'chain']
        });

      console.log(`[BalanceUpdater] Synced balance with blockchain: ${onChainBalance} SMP`);
      return onChainBalance;
    } catch (error) {
      console.error('[BalanceUpdater] Blockchain sync failed:', error);
      throw error;
    }
  }
}

// Singleton instance
export const balanceUpdater = new BalanceUpdater();
