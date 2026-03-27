"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * AuthProvider — Initializes auth state on app mount.
 * Wrap the app layout with this to ensure auth is loaded before rendering.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initialize();
    }
  }, [initialize]);

  return <>{children}</>;
}
