"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/services/supabase/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setUser(data.session?.user || null);
      setLoading(false);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    // Build a robust absolute redirect URL with scheme
    let redirectTo;
    if (typeof window !== 'undefined') {
      redirectTo = window.location.origin;
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      let site = process.env.NEXT_PUBLIC_SITE_URL.trim();
      if (!/^https?:\/\//i.test(site)) {
        const isLocal = /^localhost(:\d+)?$/i.test(site) || /^127\.0\.0\.1(:\d+)?$/i.test(site);
        site = `${isLocal ? 'http' : 'https'}://${site}`;
      }
      try {
        // Validate URL
        new URL(site);
        redirectTo = site;
      } catch {
        redirectTo = undefined; // fallback to dashboard Site URL
      }
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        ...(redirectTo ? { redirectTo } : {}),
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = useMemo(
    () => ({ user, session, loading, signInWithGoogle, signOut }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
