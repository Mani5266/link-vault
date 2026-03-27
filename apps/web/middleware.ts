import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Protected routes that require authentication.
 */
const PROTECTED_PATHS = ["/collection", "/settings", "/tags", "/duplicates", "/reading-queue", "/link-health", "/smart-collections"];

/**
 * Auth routes — redirect to dashboard if already authenticated.
 */
const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];

/**
 * Password reset route — accessible regardless of auth state.
 * The user arrives here with a valid session from the reset email link.
 */
const PASSTHROUGH_PATHS = ["/reset-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create a response we can modify (set cookies on)
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Create a single Supabase client that can read AND write cookies.
  // This handles session refresh (expired access tokens get new ones
  // via the refresh token stored in cookies).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Update the request cookies so subsequent reads see the new value
          request.cookies.set({ name, value, ...options });
          // Recreate response with updated request headers
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          // Set the cookie on the response so the browser receives it
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // getUser() validates the token server-side. If the access token is
  // expired, Supabase will use the refresh token to get a new one and
  // call the set() cookie handler above to persist it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is on a passthrough route (e.g. /reset-password), allow through
  // regardless of auth state.
  const isPassthroughRoute = PASSTHROUGH_PATHS.some((path) =>
    pathname.startsWith(path)
  );
  if (isPassthroughRoute) {
    return response;
  }

  // If user is on a protected route and NOT authenticated, redirect to login
  const isProtectedRoute =
    PROTECTED_PATHS.some((path) => pathname.startsWith(path)) ||
    pathname === "/";

  // If user is on an auth route and IS authenticated, redirect to dashboard
  const isAuthRoute = AUTH_PATHS.some((path) => pathname.startsWith(path));

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - auth callback/confirm routes (handled by route handlers)
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
