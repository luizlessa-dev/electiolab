import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "divulgacandcontas.tse.jus.br" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "www.camara.leg.br" },
      { protocol: "https", hostname: "www25.senado.leg.br" },
      { protocol: "https", hostname: "www.senado.leg.br" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
        ],
      },
    ];
  },
};

// Temporarily disable Sentry for deployment
// TODO: Configure Sentry auth token if needed
const config = process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: "lessa-labs",
      project: "javascript-nextjs",
      silent: !process.env.CI,
      tunnelRoute: "/monitoring",
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : nextConfig;

export default config;
