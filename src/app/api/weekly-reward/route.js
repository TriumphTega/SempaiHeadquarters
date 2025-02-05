import { supabase } from '../../../services/supabase/supabaseClient';

export async function POST(req) {
  try {
    // Step 1: Fetch all users with weekly_points > 0
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, weekly_points, balance')
      .gt('weekly_points', 0); // Only users with points

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch users.' }), { status: 500 });
    }

    if (users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with points this week.' }), { status: 200 });
    }

    // Step 2: Calculate total points
    const totalPoints = users.reduce((acc, user) => acc + user.weekly_points, 0);
    const totalReward = 100_000; // Total reward to distribute

    // Step 3: Distribute rewards proportionally
    const updates = users.map(user => {
      const userShare = (user.weekly_points / totalPoints) * totalReward;
      const newBalance = (user.balance || 0) + userShare;

      return {
        id: user.id,
        balance: newBalance,
        weekly_points: 0, // Reset weekly points
      };
    });

    // Step 4: Update balances and reset points
    const { error: updateError } = await supabase
      .from('users')
      .upsert(updates);

    if (updateError) {
      console.error('Error updating user balances:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update balances.' }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: '✅ Weekly rewards distributed successfully!' }), { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), { status: 500 });
  }
}
