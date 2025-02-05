'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../../services/supabase/supabaseClient';
import ConnectButton from '../../components/ConnectButton';
import { v4 as uuidv4 } from 'uuid';
import LoadingPage from '../../components/LoadingPage';

export default function NovelsPage() {
  const { connected, publicKey } = useWallet();
  const [balance, setBalance] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState('');  // For user input
  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState([]);
  const [pendingWithdrawal, setPendingWithdrawal] = useState(0);

  const checkBalance = async () => {
    if (!publicKey) {
      console.log("No public key found. Wallet might not be connected.");
      return;
    }

    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', publicKey.toString())
        .single();

      if (userError || !user) {
        console.error('Error fetching user:', userError);
        return;
      }

      const userId = user.id;

      const { data: walletBalance, error: balanceError } = await supabase
        .from("wallet_balances")
        .select("amount")
        .eq("user_id", userId)
        .single();

      if (balanceError) {
        console.error("Error fetching balance:", balanceError);
        return;
      }

      setBalance(walletBalance?.amount || 0);

      const { data: pendingData, error: pendingError } = await supabase
        .from("pending_withdrawals")
        .select("amount")
        .eq("user_id", userId)
        .eq("status", "pending");

      if (pendingError) {
        console.error("Error fetching pending withdrawals:", pendingError);
        return;
      }

      const totalPending = pendingData.reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
      setPendingWithdrawal(totalPending);

      setLoading(false);
    } catch (error) {
      console.error("Unexpected error fetching balance:", error);
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!connected) {
      alert("Please connect your wallet first.");
      return;
    }

    const amount = parseFloat(withdrawAmount);

    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid withdrawal amount.");
      return;
    }

    if (amount < 2500) {
      alert("You can withdraw a minimum of 2500.");
      return;
    }

    if (amount > balance) {
      alert("Insufficient balance for this withdrawal amount.");
      return;
    }

    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', publicKey.toString())
        .single();

      if (userError || !user) {
        console.error('Error fetching user:', userError);
        return;
      }

      const userId = user.id;
      const transactionid = uuidv4();

      const { error: insertError } = await supabase.from('pending_withdrawals').insert([{
        user_id: userId,
        amount: amount,
        transactionid,
        status: 'pending',
        createdat: new Date().toISOString(),
      }]);

      if (insertError) {
        console.error('Error inserting withdrawal request:', insertError);
        alert("Failed to initiate withdrawal.");
        return;
      }

      const { error: balanceError } = await supabase
        .from('wallet_balances')
        .update({ amount: balance - amount })
        .eq('user_id', userId);

      if (balanceError) {
        console.error('Error deducting balance from wallet_balances:', balanceError);
        alert("Failed to deduct from wallet balance.");
        return;
      }

      const { error: userBalanceError } = await supabase
        .from('users')
        .update({ balance: balance - amount })
        .eq('id', userId);

      if (userBalanceError) {
        console.error('Error deducting balance from users:', userBalanceError);
        alert("Failed to update user balance.");
        return;
      }

      alert("Withdrawal initiated successfully!");
      setWithdrawAmount(''); // Clear the input
      checkBalance();
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  const fetchNovels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('novels').select('*');

      if (error) {
        console.error('Error fetching novels:', error.message);
        setLoading(false);
        return;
      }

      setNovels(data);
      setLoading(false);
    } catch (error) {
      console.error('Unexpected error fetching novels:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      checkBalance();
    }
    fetchNovels();
  }, [connected, publicKey]);

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="bg-black">
      <header className="bg-orange py-5 text-center text-white" style={{ background: 'linear-gradient(135deg,rgb(243, 99, 22), #feb47b)' }}>
        <div className="container">
          <h1 className="text-uppercase fw-bold">Explore Our Collection</h1>

          {connected ? (
            <div style={{ background: '#000', padding: '20px', borderRadius: '15px', color: '#fff', maxWidth: '400px', margin: '20px auto' }}>
              <h5>Balance: {loading ? 'Loading...' : `${balance} SMP`}</h5>

              <input
                type="number"
                min="2500"
                max={balance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount to withdraw"
                style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px' }}
              />

              <button onClick={handleWithdraw} style={{ backgroundColor: 'red', color: '#fff', padding: '10px 20px', borderRadius: '5px' }}>
                Withdraw
              </button>

              {pendingWithdrawal > 0 && (
                <p style={{ color: 'orange', fontWeight: 'bold', marginTop: '10px' }}>
                  Pending Withdrawal: {pendingWithdrawal} SMP
                </p>
              )}
            </div>
          ) : (
            <div className="alert alert-danger">
              Please connect your wallet to proceed.
              <ConnectButton />
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
