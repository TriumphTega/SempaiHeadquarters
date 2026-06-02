import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, isWriter, isArtist, isSuperuser, name, wallet_address, image, is_benefactor, benefactor_level, current_writer_subscription')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch writer profile
    const { data: profile, error: profileError } = await supabase
      .from('writer_profiles')
      .select('bio, twitter, discord, website')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError);
    }

    // Fetch novels
    const { data: novels, error: novelsError } = await supabase
      .from('novels')
      .select('id, title, image, summary')
      .eq('user_id', user.id);

    if (novelsError) {
      console.error('Novels fetch error:', novelsError);
    }

    return NextResponse.json({
      isSuperuser: user.isSuperuser,
      isWriter: user.isWriter,
      isArtist: user.isArtist,
      profile: { ...user, ...profile },
      novels: novels || [],
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
