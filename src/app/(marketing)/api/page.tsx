import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Code, Key, Zap, FileJson, BookOpen } from "lucide-react";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "ElectioLab API — Dados eleitorais como infraestrutura",
  description: "API pública REST com eleições, pesquisas, médias ponderadas e drift histórico de candidatos brasileiros. OpenAPI 3.1, autenticação Bearer, free tier 1k req/mês.",
  alternates: { canonical: "https://electiolab.com/api" },
  openGraph: {
    title: "ElectioLab API — Dados eleitorais como infraestrutura",
    description: "REST + OpenAPI. Eleições, pesquisas, médias ponderadas, drift histórico. Free tier disponível.",
    url: "https://electiolab.com/api",
    type: "article",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/elections",
    summary: "Lista todas as eleições (presidente, governador, senador, deputado).",
  },
  {
    method: "GET",
    path: "/api/v1/polls",
    summary: "Pesquisas eleitorais com resultados por candidato. Suporta CSV.",
    params: ["election_id?", "format=json|csv", "limit"],
  },
  {
    method: "GET",
    path: "/api/v1/averages",
    summary: "Médias ponderadas com IC 95% — fórmula em /docs/weighted-averages.",
    params: ["election_id?"],
  },
  {
    method: "GET",
    path: "/api/v1/candidates-by-slug",
    summary: "Até 3 candidatos consolidados (média + última pesquisa).",
    params: ["slug (até 3×)"],
  },
  {
    method: "GET",
    path: "/api/v1/drift",
    summary: "Série temporal de % de um candidato em pesquisas (1º turno).",
    params: ["candidate_id", "days≤365"],
  },
  {
    method: "GET",
    path: "/api/v1/me",
    summary: "Status da própria API key (tier, rate limit, uso).",
    params: ["Bearer obrigatório"],
  },
];

const TIERS = [
  { name: "anonymous", limit: "60 req/mês", price: "—", note: "Sem token" },
  { name: "free", limit: "1.000 req/mês", price: "R$ 0", note: "Cadastro gratuito" },
  { name: "pro", limit: "50.000 req/mês", price: "R$ 49/mês", note: "Inclui CSV export e drift" },
  { name: "business", limit: "500.000 req/mês", price: "R$ 199/mês", note: "Inclui SLA + suporte por e-mail" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebAPI",
      name: "ElectioLab API",
      description: "REST API com eleições, pesquisas, médias ponderadas e drift histórico de candidatos brasileiros.",
      url: "https://electiolab.com/api",
      documentation: "https://electiolab.com/openapi.yaml",
      provider: { "@type": "Organization", name: "ElectioLab", url: "https://electiolab.com" },
      termsOfService: "https://electiolab.com/sobre",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: "https://electiolab.com/" },
        { "@type": "ListItem", position: 2, name: "API", item: "https://electiolab.com/api" },
      ],
    },
  ],
};

export default function ApiPage() {
  return (
    <div className="container mx-auto max-w-5xl space-y-12 px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar ao início
      </Link>

      <header className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-primary">
          <Code className="h-4 w-4" /> API REST · OpenAPI 3.1
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Dados eleitorais brasileiros como infraestrutura.
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Eleições, pesquisas, médias ponderadas com IC 95% e drift histórico de candidatos —
          tudo via REST autenticado por <strong>Bearer token</strong>. Para jornalistas, devs e analistas
          que precisam construir em cima de dados oficiais consolidados.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="/openapi.yaml"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <FileJson className="h-4 w-4" /> openapi.yaml
          </a>
          <Link
            href="/dashboard/api"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Key className="h-4 w-4" /> Pegar minha API key
          </Link>
          <Link
            href="/docs/weighted-averages"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <BookOpen className="h-4 w-4" /> Metodologia das médias
          </Link>
        </div>
      </header>

      {/* Quickstart */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Quickstart (60 segundos)</h2>
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-2 text-sm text-muted-foreground">1. Pega tua key no dashboard:</p>
            <code className="block font-mono text-sm">https://electiolab.com/dashboard/api</code>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-2 text-sm text-muted-foreground">2. Faz teu primeiro request:</p>
            <pre className="overflow-x-auto font-mono text-sm">
{`curl -H "Authorization: Bearer el_free_abc123def456" \\
  https://electiolab.com/api/v1/elections`}
            </pre>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-2 text-sm text-muted-foreground">3. Resposta:</p>
            <pre className="overflow-x-auto font-mono text-sm">
{`{
  "data": [
    {
      "id": "...",
      "name": "Presidente 2026",
      "type": "presidente",
      "year": 2026,
      "round": 1,
      "election_date": "2026-10-04",
      "is_active": true
    },
    ...
  ],
  "count": 56
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Endpoints</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Método</th>
                <th className="px-4 py-2 font-medium">Endpoint</th>
                <th className="px-4 py-2 font-medium">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ENDPOINTS.map((e) => (
                <tr key={e.path}>
                  <td className="px-4 py-3 font-mono text-xs">
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                      {e.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{e.path}</td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{e.summary}</p>
                    {e.params && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Params: <code>{e.params.join(", ")}</code>
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          Spec completa em{" "}
          <a href="/openapi.yaml" className="text-primary underline-offset-4 hover:underline">
            /openapi.yaml
          </a>
          {" — "}
          importável em Postman, Insomnia, Bruno ou similar.
        </p>
      </section>

      {/* Tiers */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Zap className="h-5 w-5 text-primary" /> Tiers e rate limit
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium">Limite mensal</th>
                <th className="px-4 py-2 font-medium">Preço</th>
                <th className="px-4 py-2 font-medium">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TIERS.map((t) => (
                <tr key={t.name}>
                  <td className="px-4 py-3 font-mono text-xs">{t.name}</td>
                  <td className="px-4 py-3">{t.limit}</td>
                  <td className="px-4 py-3 font-medium">{t.price}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          Cada response inclui <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code> e{" "}
          <code>X-RateLimit-Reset</code> headers para o cliente saber quando vai bater no teto.
        </p>
      </section>

      {/* Boas práticas */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Boas práticas e citação</h2>
        <ul className="ml-5 list-disc space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Cite a fonte:</strong> &quot;Fonte: ElectioLab&quot; nos materiais que usam estes dados.
          </li>
          <li>
            <strong>Cache responses</strong> — médias ponderadas só mudam quando ingerimos novas pesquisas
            (geralmente diário). Não há motivo para reconsultar a cada minuto.
          </li>
          <li>
            <strong>Métodologia:</strong> a fórmula das{" "}
            <Link href="/docs/weighted-averages" className="text-primary underline-offset-4 hover:underline">
              médias ponderadas
            </Link>{" "}
            e do{" "}
            <Link href="/docs/reliability-score" className="text-primary underline-offset-4 hover:underline">
              reliability_score
            </Link>{" "}
            são públicos. Citar a metodologia em apostas relevantes (rankings, comparações) é boa prática.
          </li>
          <li>
            <strong>Erros e correções:</strong> achou algo estranho? Abra issue ou e-mail{" "}
            <a href="mailto:api@electiolab.com" className="text-primary underline-offset-4 hover:underline">
              api@electiolab.com
            </a>
            .
          </li>
        </ul>
      </section>

      <footer className="space-y-3 border-t border-border pt-8 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <a
            href="https://github.com/luizlessa-dev/electiolab"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            Código no GitHub
          </a>
          <Link href="/sobre" className="hover:text-foreground">Sobre o ElectioLab</Link>
          <Link href="/privacidade" className="hover:text-foreground">Privacidade</Link>
        </div>
      </footer>
    </div>
  );
}
