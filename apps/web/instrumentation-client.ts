import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Capture 10% of traces in production for performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Capture 100% of sessions with errors for replay
  replaysOnErrorSampleRate: 1.0,

  // Capture 10% of all sessions for replay
  replaysSessionSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Filter out noisy errors
  ignoreErrors: [
    // Browser navigation / user actions
    "ResizeObserver loop",
    "AbortError",
    // Network errors users can't control
    "Failed to fetch",
    "NetworkError",
    "Load failed",
  ],
});
