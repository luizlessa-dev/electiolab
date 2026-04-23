import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/"],
      },
      // Permitir crawlers de AI explicitamente
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"],
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://electiolab.com/sitemap.xml",
  };
}
