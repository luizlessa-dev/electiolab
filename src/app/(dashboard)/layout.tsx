import type { Metadata } from "next";

/**
 * Metadata-level noindex pra todo o segmento (dashboard).
 * Páginas internas do produto (terminal, drafts, institutos, etc.) não
 * devem aparecer no índice — são experiência logada/de produto, sem
 * valor SEO próprio.
 *
 * Usamos `noindex, follow` (em vez de `Disallow:` no robots.txt) pra
 * que o Google ainda consiga rastrear os links de saída do dashboard
 * pras páginas públicas (canónicas dos candidatos, pesquisas, etc.) —
 * preserva o flow de link equity.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
