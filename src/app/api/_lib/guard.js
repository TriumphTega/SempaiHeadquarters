import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/api/supabaseAdmin";

// Shared caller checks for API routes. (`_lib` is a private folder — Next.js
// never serves it as a route.)

/** The signed-in Supabase user behind `Authorization: Bearer <access token>`, or null. */
export async function getCaller(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return data.user;
  } catch {
    return null;
  }
}

/** Returns { user } or { response } (a 401 to return as-is). */
export async function requireUser(request) {
  const user = await getCaller(request);
  if (!user) {
    return { response: NextResponse.json({ error: "Please sign in first" }, { status: 401 }) };
  }
  return { user };
}

/** Returns { user } for a signed-in superuser, or { response } (401/403). */
export async function requireSuperuser(request) {
  const { user, response } = await requireUser(request);
  if (response) return { response };
  const { data } = await supabaseAdmin.from("users").select("isSuperuser").eq("id", user.id).maybeSingle();
  if (!data?.isSuperuser) {
    return { response: NextResponse.json({ error: "Admins only" }, { status: 403 }) };
  }
  return { user };
}

/** A retired endpoint. */
export function gone() {
  return NextResponse.json({ error: "This endpoint has been retired." }, { status: 410 });
}
