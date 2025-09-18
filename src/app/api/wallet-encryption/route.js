import { NextResponse } from "next/server";

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const functionName = process.env.NEXT_PUBLIC_WALLET_FUNCTION || "wallet-encryption";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-side only

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
    const { action, data } = await request.json();
    if (!action || typeof data !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (!projectUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
    }

    const url = `${projectUrl}/functions/v1/${functionName}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({ action, data }),
    });

    const text = await resp.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch {
      json = { error: "Invalid JSON returned from function" };
    }

    if (!resp.ok) {
      return NextResponse.json({ error: json?.error || `Function error (${resp.status})` }, { status: resp.status });
    }

    // Expect { result }
    if (typeof json?.result !== "string") {
      return NextResponse.json({ error: "Invalid function response shape" }, { status: 500 });
    }

    return NextResponse.json({ result: json.result }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
