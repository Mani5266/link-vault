import type { MetadataRoute } from "next";

// ============================================================
// manifest.ts — PWA web app manifest
// ============================================================

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LinkVault — AI-Powered Link Library",
    short_name: "LinkVault",
    description:
      "Paste any link. AI makes it memorable. Find anything instantly.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#6d28d9",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
