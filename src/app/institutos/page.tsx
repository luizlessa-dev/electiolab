import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Building2, Award, ChevronRight } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Institutos de Pesquisa Eleitoral 2026 — Ranking de Acurácia",
  description:
    "Lista completa dos institutos de pesquisa eleitoral brasileiros, ranqueados pela acurácia histórica das projeções vs. resultado oficial TSE. Datafolha, Quaest, Ipec e mais.",
  alternates: { canonical: "https://electiolab.com/institutos" },
  openGraph: {
    title: "Institutos de Pesquisa 2026 — ElectioLab",
    description:
      "Ranking de acurácia dos institutos brasileiros: Datafolha, Quaest, Ipec, Atlas Intel e mais.",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

type Institute = {
  id: string;
  name: string;
  slug: string;
  reliability_score: number | null;
  methodology_default: string | null;
  poll_count: number;
};

async function getInstitutes(): Promise<Institute[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: insts } = await sb
    .from("institutes")
    .select("id, name, slug, reliability_score, methodology_default")
    .order("reliability_score", { ascending: false, nullsFirst: false });

  // Conta polls por instituto via PostgREST embedded count (alternativa: foreign aggregate)
  const insts2 = await Promise.all(
    (insts ?? []).map(async (i) => {
      const { count } = await sb
        .from("polls")
        .select("id", { count: "exact", head: true })
        .eq("institute_id", i.id);
      return { ...i, poll_count: count ?? 0 } as Institute;
    })
  );
  return insts2;
}

export default async function InstitutosPage() {
  const institutes = await getInstitutes();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>ElectioLab</span>
          </Link>
          <Link
            href="/dashboard/institutos"
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium"
          >
            Versão Terminal →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <section>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <Building2 className="h-3.5 w-3.5" />
            <span>Institutos de pesquisa eleitoral</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Quem mede o eleitorado brasileiro?
          </h1>
          <p className="text-base text-muted-foreground max-w-prose leading-relaxed">
            {institutes.length} institutos de pesquisa eleitoral indexados, ranqueados pela
            acurácia histórica das projeções vs. resultado oficial TSE. Quanto maior o score,
            mais próximas das urnas suas projeções foram.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="hidden md:flex items-center px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
            <span className="w-8">#</span>
            <span className="flex-1">Instituto</span>
            <span className="w-32">Metodologia</span>
            <span className="w-24 text-right">Pesquisas</span>
            <span className="w-24 text-right">Score</span>
            <span className="w-6"></span>
          </div>
          {institutes.map((i, idx) => (
            <Link
              key={i.id}
              href={`/instituto/${i.slug}`}
              prefetch={true}
              className="flex flex-col md:flex-row md:items-center px-4 py-3 text-sm border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors group"
            >
              <span className="md:w-8 font-mono tabular-nums text-muted-foreground">
                #{idx + 1}
              </span>
              <span className="flex-1 mt-1 md:mt-0 font-semibold group-hover:text-primary transition-colors">
                {i.name}
              </span>
              <span className="md:w-32 text-xs text-muted-foreground capitalize">
                {i.methodology_default ?? "—"}
              </span>
              <span className="md:w-24 md:text-right font-mono tabular-nums text-xs text-muted-foreground">
                {i.poll_count.toLocaleString("pt-BR")}
              </span>
              <span className="md:w-24 md:text-right font-mono tabular-nums">
                {i.reliability_score !== null ? (
                  <span
                    className={`font-bold ${
                      i.reliability_score >= 0.85
                        ? "text-positive"
                        : i.reliability_score >= 0.7
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {Math.round(i.reliability_score * 100)}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
              <ChevronRight className="hidden md:block md:w-6 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </section>

        <section className="rounded-lg border border-border bg-muted/20 p-6">
          <h3 className="text-base font-bold mb-2 flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Como o score funciona
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Para cada eleição passada (2018, 2022), comparamos a última projeção pré-eleitoral
            do instituto com o resultado oficial TSE. O <strong>desvio absoluto médio</strong>{" "}
            (mean absolute error) é convertido num score de 0 a 1: quanto menor o erro, maior
            o score. Ponderamos eleições mais recentes e cargos majoritários (presidente, governador).
          </p>
          <Link
            href="/sobre#metodologia"
            className="text-sm text-primary hover:underline"
          >
            Ver metodologia completa →
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Dados: TSE · Bacen · IBGE
        </div>
      </footer>
    </div>
  );
}
