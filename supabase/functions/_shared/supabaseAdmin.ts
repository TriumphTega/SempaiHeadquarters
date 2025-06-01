import { createClient } from "@supabase/supabase-js";

const adminKey = Deno.env.get("APP_ADMIN_KEY");

export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_ANON_KEY"),
  {
    accessToken() {
      return adminKey;
    },
  },
);
