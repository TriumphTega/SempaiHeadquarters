import { NextResponse } from "next/server";

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const functionName = "benefactor-payment";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function OPTIONS() {
  return new NextResponse("ok", {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_SITE_URL || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

export async function POST(request) {
  try {
    if (!projectUrl || !anonKey) {
      return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
    }

    const clientAuth = request.headers.get("authorization");
    if (!clientAuth) {
      return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
    }

    const body = await request.json();
    const url = `${projectUrl}/functions/v1/${functionName}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: clientAuth, // forward user JWT
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch {
      json = { error: "Invalid JSON returned from function" };
    }

    if (!resp.ok) {
      return NextResponse.json({ error: json?.error || `Function error (${resp.status})` }, { status: resp.status });
    }

    return NextResponse.json(json, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
