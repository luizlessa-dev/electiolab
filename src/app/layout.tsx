import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://electiolab.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ElectioLab — Inteligência Eleitoral",
    template: "%s — ElectioLab",
  },
  description:
    "Agregador de pesquisas eleitorais do Brasil. Média ponderada por recência, amostra e acurácia dos institutos. O FiveThirtyEight brasileiro.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "ElectioLab",
    title: "ElectioLab — Inteligência Eleitoral",
    description:
      "Agregador de pesquisas eleitorais do Brasil. Média ponderada por recência, amostra e acurácia dos institutos.",
    // Sem images aqui — opengraph-image.tsx é detectado automaticamente
    // pelo Next.js e aplicado a todas as páginas do segmento /app
  },
  twitter: {
    card: "summary_large_image",
    title: "ElectioLab — Inteligência Eleitoral",
    description:
      "Agregador de pesquisas eleitorais do Brasil. Média ponderada por recência, amostra e acurácia dos institutos.",
    // images também não necessário — Next.js usa opengraph-image.tsx
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
