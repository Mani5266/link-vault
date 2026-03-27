// ============================================================
// Sentry Instrumentation — Must be imported before all other modules
// ============================================================

import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Capture 10% of traces in production for performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Set the environment
  environment: process.env.NODE_ENV || "development",

  // Filter out noisy errors
  ignoreErrors: [
    // Supabase auth errors that users cause (wrong password, etc.)
    "Invalid login credentials",
    "Email not confirmed",
  ],
});
