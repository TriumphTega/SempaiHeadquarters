// app/api/benefactor-payment-proxy/route.js
import { NextResponse } from "next/server";

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const functionName = "benefactor-payment";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_SITE_URL || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

export async function POST(request) {
  try {
    if (!projectUrl || !anonKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }

    const body = await request.json();

    // Optional: Basic validation
    if (!body.novelId || !body.planType || !body.signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const url = `${projectUrl}/functions/v1/${functionName}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,        // Forward user's JWT
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    });

    let data;
    try {
      data = await resp.json();
    } catch {
      data = { error: "Invalid response from Supabase function" };
    }

    if (!resp.ok) {
      return NextResponse.json(
        { error: data?.error || `Edge function failed (${resp.status})` },
        { status: resp.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error("[benefactor-payment-proxy] Error:", error);
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}