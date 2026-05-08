import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Code, Palette, Maximize2, Copy } from "lucide-react";

export const metadata: Metadata = {
  title: "Embed Widget — Inclua dados eleitorais no seu site | ElectioLab",
  description:
    "Embed gratuito do ElectioLab pra blogs, jornais e portais. Mostre média ponderada de pesquisas eleitorais 2026 em qualquer página com 2 linhas de HTML.",
  alternates: { canonical: "https://electiolab.com/embed" },
  openGraph: {
    title: "Embed ElectioLab — Pesquisas eleitorais no seu site",
    description: "Cole 2 linhas de HTML e tenha média ponderada das pesquisas em qualquer página.",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

const PRES_ID = "21f8e9a3-5ff8-4baf-b0ae-6b00d2614248"; // Pres 2026 1T
const MG_ID = "ce047ca5-9962-4c94-95dd-f400a1994d03"; // Gov MG 2026

export default function EmbedDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>ElectioLab</span>
          </Link>
          <Link
            href="/imprensa"
            className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 font-medium"
          >
            Imprensa
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <section>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <Code className="h-3.5 w-3.5" />
            <span>Embed widget gratuito</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Mostre pesquisas eleitorais no seu site
          </h1>
          <p className="text-base text-muted-foreground max-w-prose leading-relaxed">
            Cole 2 linhas de HTML em qualquer blog, jornal ou portal e tenha um widget
            atualizado em tempo real com a média ponderada das pesquisas. Gratuito, sem login,
            sem rastreamento de visitantes.
          </p>
        </section>

        {/* Como usar */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Como usar</h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium mb-2">1. Encontre o ID da eleição</p>
            <p className="text-sm text-muted-foreground mb-3">
              Acesse <Link href="/dashboard" className="text-primary hover:underline">/dashboard</Link>,
              selecione a eleição que quer embutir, e copie o ID da URL (`?election=...`).
              Alguns IDs prontos:
            </p>
            <ul className="text-xs space-y-1 font-mono">
              <li>
                <strong>Presidência 2026 (1º turno):</strong> <code>{PRES_ID}</code>
              </li>
              <li>
                <strong>Governador MG 2026:</strong> <code>{MG_ID}</code>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium mb-2">2. Cole o HTML</p>
            <pre className="bg-muted/40 rounded-md p-3 text-xs overflow-x-auto font-mono">
{`<div data-electiolab-eleicao="${PRES_ID}"></div>
<script src="https://electiolab.com/embed.js" async></script>`}
            </pre>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium mb-2">3. Pronto</p>
            <p className="text-sm text-muted-foreground">
              O widget aparece automaticamente. Se você troca o ID dinamicamente (SPA), ele
              re-renderiza sozinho via MutationObserver.
            </p>
          </div>
        </section>

        {/* Preview ao vivo */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Preview ao vivo
          </h2>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-2">
                Light · médio (padrão) · Presidência 2026
              </p>
              <iframe
                src={`/embed/eleicao/${PRES_ID}?theme=light&size=md`}
                className="w-full rounded-lg border border-border"
                style={{ height: 420 }}
                title="Embed light medium"
              />
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-2">
                Dark · grande · Governador MG
              </p>
              <iframe
                src={`/embed/eleicao/${MG_ID}?theme=dark&size=lg`}
                className="w-full rounded-lg border border-border"
                style={{ height: 560 }}
                title="Embed dark large"
              />
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-2">
                Light · pequeno · Governador MG
              </p>
              <iframe
                src={`/embed/eleicao/${MG_ID}?theme=light&size=sm`}
                className="w-full rounded-lg border border-border"
                style={{ height: 320 }}
                title="Embed light small"
              />
            </div>
          </div>
        </section>

        {/* Customização */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Maximize2 className="h-4 w-4" />
            Atributos suportados
          </h2>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_2fr] gap-px bg-border">
              {[
                ["data-electiolab-eleicao", "ID da eleição (obrigatório)"],
                ["data-theme", '"light" (padrão) ou "dark"'],
                ["data-size", '"sm" (5 candidatos) · "md" (8) · "lg" (8 com fontes maiores)'],
                ["data-height", "altura em px (default 420; sm=320; lg=560)"],
              ].map(([attr, desc]) => (
                <>
                  <div key={attr} className="bg-card p-3 font-mono text-xs">{attr}</div>
                  <div key={attr + "-d"} className="bg-card p-3 text-xs text-muted-foreground">{desc}</div>
                </>
              ))}
            </div>
          </div>
        </section>

        {/* Termos */}
        <section className="rounded-lg border border-border bg-muted/20 p-6 space-y-2">
          <h3 className="text-base font-bold">Termos de uso</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-5 leading-relaxed">
            <li>Uso editorial gratuito (jornais, blogs, portais).</li>
            <li>Não modifique o branding "ElectioLab" no rodapé do widget.</li>
            <li>Os dados podem ser cacheados pelo navegador por até 1h.</li>
            <li>Se precisar de SLA, customização visual ou white-label,
              <Link href="/precos" className="text-primary hover:underline"> veja os planos Business</Link>.
            </li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Embed gratuito · Sem rastreamento de visitantes do seu site
        </div>
      </footer>
    </div>
  );
}
