import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { PlanosGovernoAviso } from "@/components/planos-governo-aviso";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Planos de governo — presidenciáveis 2026, por tema",
  description:
    "O que cada presidenciável propõe para cada tema, direto do plano de governo oficial registrado no TSE — trecho literal, sem comparação nem nota.",
  alternates: { canonical: "https://electiolab.com/planos" },
  openGraph: {
    title: "Planos de governo dos presidenciáveis 2026, por tema",
    description: "Trecho literal de cada plano de governo, organizado por tema. Sem ranking, sem opinião.",
    url: "https://electiolab.com/planos",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

type TemaComContagem = { slug: string; nome: string; ordem: number; trechos: number };

async function getTemas(): Promise<TemaComContagem[]> {
  const supabase = sb();
  const { data: temas } = await supabase.from("tema").select("id, slug, nome, ordem").order("ordem");
  if (!temas) return [];

  const comContagem = await Promise.all(
    temas.map(async (t) => {
      const { count } = await supabase
        .from("plano_trecho")
        .select("id", { count: "exact", head: true })
        .eq("status", "aprovado")
        .eq("tema_id", t.id);
      return { slug: t.slug, nome: t.nome, ordem: t.ordem, trechos: count ?? 0 };
    })
  );
  return comContagem;
}

export default async function PlanosPage() {
  const temas = await getTemas();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Planos de governo dos presidenciáveis 2026, por tema",
        description:
          "O que cada presidenciável propõe para cada tema, direto do plano de governo oficial registrado no TSE.",
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        datePublished: "2026-08-23",
        dateModified: new Date().toISOString().slice(0, 10),
        inLanguage: "pt-BR",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
          { "@type": "ListItem", position: 2, name: "Planos de governo" },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="sticky top-0 z-30 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>ElectioLab</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <article>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Eleição presidencial 2026</span>
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Planos de governo, por tema</h1>
          <p className="mb-6 text-base leading-relaxed text-muted-foreground">
            Cada tema abaixo mostra o que os planos de governo oficiais dizem sobre ele — um bloco por candidato,
            em ordem alfabética, com trecho literal, número da página e link pro PDF original registrado no TSE.
            Sem comparação, nota ou ranking entre candidatos.
          </p>

          <div className="mb-8">
            <PlanosGovernoAviso />
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {temas.map((t, i) => (
              <Link
                key={t.slug}
                href={`/planos/${t.slug}`}
                className={`flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted/30 ${
                  i !== temas.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                <span className="font-medium">{t.nome}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {t.trechos > 0 ? `${t.trechos} trecho(s)` : "sem trecho ainda"}
                </span>
              </Link>
            ))}
          </div>
        </article>
      </main>

      <footer className="mt-12 border-t border-border py-6">
        <div className="mx-auto max-w-3xl px-4 text-center font-mono text-xs text-muted-foreground">
          ElectioLab · Planos de governo via TSE (DivulgaCandContas)
        </div>
      </footer>
    </div>
  );
}
