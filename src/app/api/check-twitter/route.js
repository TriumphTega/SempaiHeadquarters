// src/app/api/check-twitter/route.js
import { NextResponse } from "next/server";
import axios from "axios";
import { supabase } from "@/services/supabase/supabaseClient";




export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  console.log(`API Request: method=GET, url=${request.url}, username=${username}`);

  if (!username) {
    console.log("Missing username parameter");
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  // Rate limiting
  if (supabase) {
    const clientIp =
      request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || "unknown";
    const rateLimitKey = `rate-limit:${clientIp}`;
    const rateLimitWindow = 15 * 60 * 1000;
    const maxRequests = 100;

    let count = 0;
    let lastReset = Date.now();

    try {
      const { data: rateLimit, error: rateLimitError } = await supabase
        .from("rate_limits")
        .select("count, last_reset")
        .eq("ip", rateLimitKey)
        .single();

      if (!rateLimit) {
        await supabase
          .from("rate_limits")
          .insert({ ip: rateLimitKey, count: 0, last_reset: new Date().toISOString() });
      } else {
        count = rateLimit.count;
        lastReset = new Date(rateLimit.last_reset).getTime();
      }

      if (Date.now() - lastReset > rateLimitWindow) {
        count = 0;
        lastReset = Date.now();
        await supabase
          .from("rate_limits")
          .update({ count: 0, last_reset: new Date().toISOString() })
          .eq("ip", rateLimitKey);
      }

      if (count >= maxRequests) {
        return NextResponse.json(
          { error: "Too many requests, please try again later." },
          { status: 429 }
        );
      }

      await supabase
        .from("rate_limits")
        .update({ count: count + 1 })
        .eq("ip", rateLimitKey);
    } catch (error) {
      console.error("Rate limiting error:", error.message);
    }
  }

  try {
    console.log(`Fetching Twitter profile for username: ${username}`);
    const response = await axios.get(`https://twitter.com/${username}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html",
      },
      timeout: 5000,
    });

    console.log(`Twitter response: status=${response.status}`);
    const isValid = response.status === 200 && !response.data.includes("Sorry, that page doesn’t exist!");
    return NextResponse.json({ exists: isValid, username });
  } catch (error) {
    console.error(`Error checking username ${username}:`, error.message);
    if (error.response && error.response.status === 404) {
      return NextResponse.json({ exists: false, username });
    }
    return NextResponse.json(
      { error: "Failed to verify username", details: error.message },
      { status: 500 }
    );
  }
}