"use server";

import { supabase } from "@/services/supabase/supabaseClient";
import { cookies } from "next/headers";
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(accessToken);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  const { error } = await supabase
    .from('hoard_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, message: "Removed successfully" });
}