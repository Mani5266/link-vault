"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        className="font-body antialiased"
        style={{
          backgroundColor: "#0a0a0c",
          color: "#e8e4de",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "#a09a90",
              fontSize: "0.875rem",
              maxWidth: "28rem",
              marginBottom: "1.5rem",
            }}
          >
            An unexpected error occurred. The issue has been reported
            automatically.
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: "#c45d3e",
              color: "#fff",
              padding: "0.625rem 1.25rem",
              border: "none",
              borderRadius: "3px",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
