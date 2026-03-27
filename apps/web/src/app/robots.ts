import type { MetadataRoute } from "next";

// ============================================================
// robots.ts — Controls search engine crawling
// ============================================================

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://linkvault.app"}/sitemap.xml`,
  };
}
