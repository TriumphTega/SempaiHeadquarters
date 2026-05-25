import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the token and get user
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user's leaderboard rank
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, weekly_points, amethyst_count, balance')
      .or('weekly_points.gt.0,balance.gt.0')
      .order('weekly_points', { ascending: false, nullsFirst: false });

    if (usersError) {
      return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Calculate user's rank
    const userIndex = users.findIndex(u => u.id === user.id);
    const rank = userIndex >= 0 ? userIndex + 1 : null;

    return Response.json({ 
      rank,
      isTop50: rank ? rank <= 50 : false 
    });

  } catch (error) {
    console.error('Error checking leaderboard rank:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
