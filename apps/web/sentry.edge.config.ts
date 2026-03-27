import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Capture 10% of traces in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
