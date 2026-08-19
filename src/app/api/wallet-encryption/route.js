import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const functionName = process.env.NEXT_PUBLIC_WALLET_FUNCTION || "wallet-encryption";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client with service role for server-side admin access
const supabase = createClient(projectUrl, serviceRoleKey);

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
      console.error("[Wallet Encryption] Missing config:", { 
        hasProjectUrl: !!projectUrl, 
        hasServiceRoleKey: !!serviceRoleKey 
      });
      return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
    }

    const url = `${projectUrl}/functions/v1/${functionName}`;
    console.log("[Wallet Encryption] Calling function:", { url, functionName });
    
    // Use Supabase client to invoke the function
    const { data: result, error } = await supabase.functions.invoke(functionName, {
      body: { action, data },
    });

    if (error) {
      console.error("[Wallet Encryption] Supabase function error:", error);
      return NextResponse.json({ error: error.message || "Function invocation failed" }, { status: 500 });
    }

    // Expect { result }
    if (typeof result?.result !== "string") {
      console.error("[Wallet Encryption] Invalid response shape:", result);
      return NextResponse.json({ error: "Invalid function response shape" }, { status: 500 });
    }

    return NextResponse.json({ result: result.result }, { status: 200 });
  } catch (e) {
    console.error("[Wallet Encryption] Server error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
