import { supabase } from '@/services/supabase/supabaseClient';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { NextResponse } from 'next/server';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const keypairArray = JSON.parse(process.env.TREASURY_WALLET_KEYPAIR);
const treasuryKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairArray));
const TREASURY_WALLET = treasuryKeypair.publicKey;

export async function POST(req) {
  const { publicKey, plan, transactionSignature } = await req.json();

  if (!publicKey || !plan || !transactionSignature || !['3_chapters', 'all_chapters'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid or missing fields' }, { status: 400 });
  }

  try {
    // Fetch user_id from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', publicKey)
      .single();

    if (userError || !user) {
      console.error("User fetch error:", userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user.id;

    // Verify Solana transaction
    const tx = await connection.getTransaction(transactionSignature, { commitment: 'confirmed' });
    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 400 });
    }

    const recipient = tx.transaction.message.accountKeys[1];
    const amount = tx.meta.postBalances[1] - tx.meta.preBalances[1];
    const expectedAmount = plan === '3_chapters' ? 0.1 * 1e9 : 0.5 * 1e9;

    if (!recipient.equals(TREASURY_WALLET) || amount < expectedAmount) {
      return NextResponse.json({ error: 'Invalid payment' }, { status: 400 });
    }

    // Set expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (plan === '3_chapters' ? 30 : 365));

    // Insert subscription
    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan,
        expires_at: expiresAt.toISOString(),
        transaction_signature: transactionSignature,
      });

    if (insertError) {
      console.error("Subscription insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Subscription successful' });
  } catch (err) {
    console.error("Subscription error:", err);
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
  }
}