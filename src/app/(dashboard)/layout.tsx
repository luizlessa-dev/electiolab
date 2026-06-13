import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

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

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "/dashboard";
    redirect(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }

  return children;
}
