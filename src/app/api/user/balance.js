import {supabase} from '../../../services/supabase/supabaseClient'

export default async function handler(req, res) {
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ success: false, error: "No user ID provided" });

  const { data, error } = await supabase
    .from("wallet_balances")
    .select("amount")
    .eq("user_id", userId)
    .eq("currency", "SMP")
    .single();

  if (error || !data) return res.status(400).json({ success: false, error: "Balance not found" });

  return res.status(200).json({ success: true, balance: data.amount });
}
