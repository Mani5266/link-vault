const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@linkvault/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Sentry org and project slugs (set via env vars for flexibility)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps for readable stack traces
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Route browser Sentry requests through Next.js server to avoid ad-blockers
  tunnelRoute: "/monitoring",

  // Suppress build logs unless running in CI
  silent: !process.env.CI,

  // Disable source map upload in development
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
});
