import { NextResponse } from "next/server";

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const functionName = "unlock-chapter";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function OPTIONS() {
  return new NextResponse("ok", { status: 200 });
}

export async function POST(request) {
  try {
    console.log("🔥 [unlock-chapter-proxy] REQUEST RECEIVED");

    if (!projectUrl || !anonKey) {
      console.error("❌ Missing Supabase env vars");
      return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
    }

    const body = await request.json();
    console.log("📦 [unlock-chapter-proxy] Body received:", body);
    console.log("🔑 [unlock-chapter-proxy] Sending to:", `${projectUrl}/functions/v1/${functionName}`);

    const resp = await fetch(`${projectUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    });

    console.log("📡 [unlock-chapter-proxy] Edge response status:", resp.status);

    const text = await resp.text();
    console.log("📄 [unlock-chapter-proxy] Raw response:", text);

    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch (e) {
      json = { error: "Invalid JSON", raw: text };
    }

    if (!resp.ok) {
      console.error("❌ [unlock-chapter-proxy] Edge function FAILED:", resp.status, json);
      return NextResponse.json({ error: json.error || `Edge error ${resp.status}` }, { status: resp.status });
    }

    console.log("✅ [unlock-chapter-proxy] SUCCESS from edge function");
    return NextResponse.json(json);

  } catch (e) {
    console.error("💥 [unlock-chapter-proxy] Proxy crashed:", e);
    return NextResponse.json({ error: e.message || "Proxy error" }, { status: 500 });
  }
}