import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // /dashboard intencionalmente NÃO está em disallow:
  //   - O segmento (dashboard) exporta noindex no layout (metadata-level)
  //   - Permitir crawl deixa o Google seguir os links internos pras
  //     páginas públicas canónicas (candidatos, pesquisas, etc.) e
  //     preserva o link equity. Disallow no robots.txt bloquearia
  //     o crawl inteiro e perderia esse flow.
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
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
