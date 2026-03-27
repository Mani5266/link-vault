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

/**
 * Create a Supabase client scoped to a specific user's JWT.
 * This respects Row Level Security policies.
 */
export function createUserClient(accessToken: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
