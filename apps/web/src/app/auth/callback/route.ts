import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /auth/callback
 * Handles magic link and password reset callbacks from Supabase.
 * Exchanges the auth code for a session, then redirects to the
 * destination specified by the `next` query param (defaults to /).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If there's no code or an error, redirect to login with error
  return NextResponse.redirect(
    `${origin}/login?error=auth_callback_failed`
  );
}
