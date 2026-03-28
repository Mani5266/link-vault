"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import type { UserProfile } from "@linkvault/shared";

/**
 * Helper to build a UserProfile from a Supabase user object.
 */
function buildProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}): UserProfile {
  return {
    id: user.id,
    email: user.email || "",
    display_name:
      user.user_metadata?.full_name || user.user_metadata?.name || null,
    avatar_url: user.user_metadata?.avatar_url || null,
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
  };
}

/**
 * Custom hook for Supabase authentication.
 * Manages session state, login, logout, and auth state changes.
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    accessToken,
    setAuth,
    setAccessToken,
    setLoading,
    logout: clearAuthState,
  } = useAuthStore();

  const supabase = createClient();

  // Track whether initialize() has completed.
  // Prevents onAuthStateChange from setting stale tokens on page load.
  const initDone = useRef(false);

  /**
   * Initialize auth state from existing session.
   * Uses getUser() to server-validate the token, then getSession()
   * to get the (possibly refreshed) access token.
   */
  const initialize = useCallback(async () => {
    try {
      setLoading(true);

      // getUser() validates the token server-side and triggers
      // a token refresh if the access token is expired.
      const {
        data: { user: validatedUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !validatedUser) {
        // No valid session — clear everything atomically
        setAuth(null, null);
        return;
      }

      // Now get the (refreshed) session to obtain the current access token.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // Set user + token atomically — no render gap where
        // isAuthenticated=true but accessToken=null.
        setAuth(buildProfile(validatedUser), session.access_token);
      } else {
        setAuth(null, null);
      }
    } catch {
      // Auth initialization failed — clear state
      setAuth(null, null);
    } finally {
      initDone.current = true;
    }
  }, [supabase.auth, setAuth, setLoading]);

  /**
   * Sign in with magic link (email).
   */
  const signInWithMagicLink = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    },
    [supabase.auth]
  );

  /**
   * Sign up with email and password.
   * Sends a confirmation email — user must verify before signing in.
   */
  const signUpWithPassword = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      // Supabase returns a user with identities=[] if the email is already registered
      if (
        data.user &&
        data.user.identities &&
        data.user.identities.length === 0
      ) {
        throw new Error(
          "An account with this email already exists. Please sign in instead."
        );
      }

      return data;
    },
    [supabase.auth]
  );

  /**
   * Sign in with email and password.
   * Immediately populates the auth store so the dashboard can
   * make authenticated API calls without waiting for onAuthStateChange.
   */
  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Populate the store atomically so the dashboard has both user and
      // token immediately when it mounts.
      if (data.session?.user) {
        setAuth(buildProfile(data.session.user), data.session.access_token);
      }

      return data;
    },
    [supabase.auth, setAuth]
  );

  /**
   * Send a password reset email.
   * The email contains a link that redirects to /auth/callback?next=/reset-password
   */
  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) {
        throw error;
      }
    },
    [supabase.auth]
  );

  /**
   * Update the current user's password.
   * Called after the user clicks the reset link and lands on /reset-password.
   */
  const updatePassword = useCallback(
    async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }
    },
    [supabase.auth]
  );

  /**
   * Update the current user's profile (display name).
   * Uses Supabase user_metadata so no backend endpoint is needed.
   */
  const updateProfile = useCallback(
    async (updates: { display_name?: string | null }) => {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: updates.display_name ?? undefined,
        },
      });

      if (error) {
        throw error;
      }

      // Update the auth store with the new profile
      if (data.user) {
        const profile = buildProfile(data.user);
        // Preserve the current access token
        const currentToken = useAuthStore.getState().accessToken;
        setAuth(profile, currentToken);
      }
    },
    [supabase.auth, setAuth]
  );

  /**
   * Sign out the current user.
   */
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    clearAuthState();
  }, [supabase.auth, clearAuthState]);

  /**
   * Listen for auth state changes (login, logout, token refresh).
   *
   * IMPORTANT: We ignore SIGNED_IN / INITIAL_SESSION events until
   * initialize() has completed. On page load, Supabase fires these
   * events with the cached session which may contain an expired
   * access token. initialize() validates the token server-side first.
   *
   * After init, SIGNED_IN events are from magic link callbacks etc. and
   * are safe to process.
   */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        session?.user
      ) {
        // Skip if initialize() hasn't completed yet — it will
        // validate and set the auth state properly.
        if (!initDone.current) return;
        setAuth(buildProfile(session.user), session.access_token);
      } else if (event === "TOKEN_REFRESHED" && session) {
        setAccessToken(session.access_token);
      } else if (event === "PASSWORD_RECOVERY" && session) {
        // User clicked the password reset link — set their session
        // so /reset-password can call updateUser().
        setAuth(buildProfile(session.user), session.access_token);
      } else if (event === "SIGNED_OUT") {
        clearAuthState();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, setAuth, setAccessToken, clearAuthState]);

  return {
    user,
    isAuthenticated,
    isLoading,
    accessToken,
    initialize,
    signInWithMagicLink,
    signUpWithPassword,
    signInWithPassword,
    resetPassword,
    updatePassword,
    updateProfile,
    signOut,
  };
}
