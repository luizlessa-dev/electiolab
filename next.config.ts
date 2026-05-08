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
};

export default withSentryConfig(nextConfig, {
  org: "lessa-labs",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
});
