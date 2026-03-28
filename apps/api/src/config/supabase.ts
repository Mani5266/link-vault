import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Supabase Admin Client — uses the service role key.
 * This bypasses Row Level Security, so use carefully.
 * Only used server-side for admin operations.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
