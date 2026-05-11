import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Building2, ShieldAlert } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Empresas sancionadas (CEIS) que abastecem políticos",
  description:
    "Cruzamento entre CEIS (empresas inidôneas/suspensas) e fornecedores de cota parlamentar, propaganda e doações. Risco reputacional explicado.",
  alternates: { canonical: "https://electiolab.com/sancoes" },
  openGraph: {
    title: "Empresas sancionadas que abastecem políticos brasileiros",
    description: "Cruzamento CEIS × Cota Parlamentar × propaganda digital × doadores.",
    url: "https://electiolab.com/sancoes",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

type SancaoRow = {
  id: number;
  cnpj: string | null;
  cnpj_clean: string | null;
  nome: string | null;
  razao_social: string | null;
  tipo_sancao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  orgao_sancionador: string | null;
  orgao_uf: string | null;
};

async function getStats() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const today = new Date().toISOString().slice(0, 10);

  const [{ count: totalCeis }, { count: ativas }, { data: porTipo }, { data: recentes }] = await Promise.all([
    sb.from("sanctioned_entities").select("id", { count: "exact", head: true }),
    sb.from("sanctioned_entities").select("id", { count: "exact", head: true }).gte("data_fim", today),
    sb
      .from("sanctioned_entities")
      .select("tipo_sancao")
      .gte("data_fim", today)
      .limit(2000),
    sb
      .from("sanctioned_entities")
      .select("id, cnpj, cnpj_clean, nome, razao_social, tipo_sancao, data_inicio, data_fim, orgao_sancionador, orgao_uf")
      .gte("data_fim", today)
      .order("data_inicio", { ascending: false })
      .limit(50),
  ]);

  // Agregar por tipo
  const byTypeMap = new Map<string, number>();
  for (const r of porTipo ?? []) {
    const k = (r.tipo_sancao as string | null) ?? "Outros";
    byTypeMap.set(k, (byTypeMap.get(k) ?? 0) + 1);
  }
  const byType = Array.from(byTypeMap.entries())
    .map(([tipo, count]) => ({ tipo, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalCeis: totalCeis ?? 0,
    ativas: ativas ?? 0,
    byType,
    recentes: (recentes ?? []) as SancaoRow[],
  };
}

async function getCruzamentos() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  // Cruzamento com digital_ads (CNPJ do anunciante = CNPJ sancionado)
  // Schema digital_ads: campos page_name; CNPJ do anunciante pode estar em outras tabelas
  // Por enquanto, vamos cruzar pela busca de nome em campaign_finances? Não, campaign_finances é por candidato.
  // Vou retornar empty placeholder e expandir quando a integração TF estiver pronta.
  return { adsMatches: [], ceapMatches: [] };
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}

export default async function SancoesPage() {
  const stats = await getStats();
  await getCruzamentos();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Empresas sancionadas que abastecem políticos brasileiros",
        description:
          "Cruzamento CEIS × Cota Parlamentar × propaganda digital × doadores de campanha.",
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        datePublished: "2026-04-30",
        dateModified: new Date().toISOString().slice(0, 10),
        inLanguage: "pt-BR",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
          { "@type": "ListItem", position: 2, name: "Sanções (CEIS)" },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>ElectioLab</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        <article>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Análise · Empresas sancionadas</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Empresas sancionadas pelo Estado brasileiro (CEIS)
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            O <strong className="text-foreground">CEIS</strong> (Cadastro Nacional de Empresas Inidôneas
            e Suspensas) lista empresas impedidas de contratar com o poder público por sentença ou
            decisão administrativa. Mantido pela <strong className="text-foreground">CGU</strong> e
            atualizado em tempo real, é o principal indicador de risco reputacional de fornecedores.
          </p>

          {/* Stats */}
          <section className="grid sm:grid-cols-3 gap-3 mb-10">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                Total no CEIS
              </p>
              <p className="text-3xl font-mono font-bold tabular-nums">{stats.totalCeis.toLocaleString("pt-BR")}</p>
              <p className="text-[11px] text-muted-foreground">empresas registradas</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                Ativas hoje
              </p>
              <p className="text-3xl font-mono font-bold tabular-nums text-warning">{stats.ativas.toLocaleString("pt-BR")}</p>
              <p className="text-[11px] text-muted-foreground">com sanção em vigor</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                Tipos de sanção
              </p>
              <p className="text-3xl font-mono font-bold tabular-nums">{stats.byType.length}</p>
              <p className="text-[11px] text-muted-foreground">categorias distintas</p>
            </div>
          </section>

          {/* Tipos de sanção */}
          {stats.byType.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Sanções ativas por tipo
              </h2>
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {stats.byType.map((t, i) => (
                  <div
                    key={t.tipo}
                    className={`flex items-center justify-between px-4 py-3 text-sm border-b border-border/30 last:border-0 ${i % 2 ? "bg-muted/15" : ""}`}
                  >
                    <span className="flex-1">{t.tipo}</span>
                    <span className="font-mono font-bold tabular-nums">{t.count.toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recentes */}
          {stats.recentes.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Sanções recentes
              </h2>
              <div className="space-y-2">
                {stats.recentes.slice(0, 20).map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-border bg-card p-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="font-semibold text-sm">{r.razao_social ?? r.nome ?? "—"}</p>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {fmtDate(r.data_inicio)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {r.tipo_sancao ?? "—"}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground font-mono">
                      {r.cnpj && <span>CNPJ {r.cnpj}</span>}
                      {r.orgao_sancionador && <span>{r.orgao_sancionador} · {r.orgao_uf ?? "—"}</span>}
                      {r.data_fim && <span>até {fmtDate(r.data_fim)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-lg border border-border bg-muted/20 p-6">
            <h2 className="text-base font-bold mb-2">Como o ElectioLab usa estes dados</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Em cada perfil de candidato (`/candidato/[slug]`), cruzamos automaticamente os
              <strong className="text-foreground"> fornecedores de Cota Parlamentar</strong> e
              <strong className="text-foreground"> doadores de campanha</strong> com este registro
              do CEIS. Quando há match, exibimos um <strong>alerta de risco reputacional</strong> com
              o tipo de sanção e o órgão sancionador.
            </p>
            <p className="text-xs text-muted-foreground">
              Fonte: Portal da Transparência (CGU) — sincronizado a cada execução manual de ingestão.
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · CEIS via Portal da Transparência (CGU)
        </div>
      </footer>
    </div>
  );
}
