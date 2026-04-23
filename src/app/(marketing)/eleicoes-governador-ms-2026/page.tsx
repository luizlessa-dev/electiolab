import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador MS 2026 — Eduardo Riedel Favorito | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Mato Grosso do Sul 2026. Eduardo Riedel (PP) 47,8%, Fábio Trad (PSD) 14,4% — Instituto Resultado mar/2026.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-ms-2026" },
  openGraph: {
    title: "Pesquisas Governador MS 2026 — Eduardo Riedel Favorito | ElectioLab",
    description: "Eduardo Riedel (PP) 47,8%, Fábio Trad (PSD) 14,4% — Instituto Resultado mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-ms-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Eduardo Riedel", party: "PP",  pct: 47.83 },
  { name: "Fábio Trad",     party: "PSD", pct: 14.41 },
  { name: "Marcos Pollon",  party: "PL",  pct: 11.0  },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Mato Grosso do Sul em 2026?",
    answer: "Eduardo Riedel (PP), atual governador, lidera com 47,83% no Instituto Resultado (5–9 mar/2026). Fábio Trad (PSD) aparece em segundo com 14,41% e Marcos Pollon (PL) com 11%. O Real Time Big Data (nov/2025) apontou Riedel com 55%. O governador está no 1º mandato e é forte candidato à reeleição, com aprovação acima de 70% na gestão estadual.",
  },
  {
    question: "Eduardo Riedel pode ser reeleito governador do Mato Grosso do Sul?",
    answer: "Eduardo Riedel (PP) assumiu o governo do MS em 2023 em seu 1º mandato e é constitucionalmente elegível para reeleição em 2026. Com quase 48% nas pesquisas e aprovação de 70%, está na posição mais confortável entre os governadores do Centro-Oeste que concorrem à reeleição. O legado do agronegócio, a política fiscal equilibrada e a continuidade do modelo iniciado por Reinaldo Azambuja (PSDB) sustentam sua popularidade.",
  },
  {
    question: "Quem são os principais oponentes de Riedel no MS?",
    answer: "Os principais candidatos que enfrentam Riedel nas pesquisas são Fábio Trad (PSD), advogado e ex-deputado federal conhecido por sua trajetória jurídica, e Marcos Pollon (PL), ligado ao campo bolsonarista. Com 14% e 11% respectivamente, nenhum representa ameaça real ao governador no quadro atual — seria necessária uma candidatura de unificação do campo de oposição para tornar a corrida competitiva.",
  },
  {
    question: "Qual o papel do agronegócio na política do Mato Grosso do Sul?",
    answer: "O Mato Grosso do Sul é o 2º maior produtor de soja do Brasil e líder nacional em bovinocultura. O agronegócio estrutura a política estadual — candidatos avaliados pela posição sobre uso da terra, expansão do crédito rural e acesso ao mercado externo têm vantagem natural. Riedel, alinhado às demandas do setor e com boa relação com o Congresso, captura esse eleitorado de forma dominante.",
  },
  {
    question: "Quando é a eleição para governador do Mato Grosso do Sul em 2026?",
    answer: "A eleição para governador do Mato Grosso do Sul ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O MS tem aproximadamente 2 milhões de eleitores. O estado faz fronteira com Bolivia e Paraguai — o que gera questões específicas de segurança de fronteira, tráfico e infraestrutura que têm grande peso nas campanhas eleitorais locais.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function GovernadorMS2026Page() {
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-16 space-y-16">
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Mato Grosso do Sul · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador MS 2026 — Riedel 47,8% Favorito à Reeleição</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Instituto Resultado (5–9 mar/2026): Eduardo Riedel (PP) 47,83%, Fábio Trad (PSD) 14,41%,
            Marcos Pollon (PL) 11%. Governador no 1º mandato com 70% de aprovação —
            entre os mais confortáveis do Centro-Oeste.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Instituto Resultado · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Presencial</span>
              <span className="text-xs font-mono text-muted-foreground">5–9 mar/2026</span>
            </div>
            <div className="divide-y divide-border">
              {POLL_SNAPSHOT.map((c, i) => (
                <div key={c.name} className="px-4 py-3 flex items-center gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.party}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 hidden sm:block">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 54) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: Instituto Resultado · Cenário estimulado, 1º turno</p>
        </section>
        <section className="space-y-4" id="faq">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Perguntas frequentes</h2>
          </div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="border border-border rounded-sm bg-card overflow-hidden group">
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center justify-between gap-3">
                  {item.question}
                  <span className="text-muted-foreground text-xs shrink-0 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">{item.answer}</div>
              </details>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Outras eleições 2026</h2>
          <div className="grid sm:grid-cols-3 gap-px bg-border rounded-sm overflow-hidden">
            {[
              { label: "Presidente 2026",    href: "/pesquisas-presidenciais-2026" },
              { label: "Governador GO 2026", href: "/eleicoes-governador-go-2026" },
              { label: "Governador MT 2026", href: "/eleicoes-governador-mt-2026" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="bg-card px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-between">
                {l.label} <span className="text-primary">→</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="border border-border rounded-sm bg-card px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Dados ao vivo no Dashboard</p>
            <p className="text-xs text-muted-foreground max-w-sm">Média ponderada atualizada, tendência histórica e ranking de acurácia dos institutos.</p>
          </div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors shrink-0">
            <ExternalLink className="h-3.5 w-3.5" /> Abrir dashboard
          </Link>
        </section>
      </main>
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-muted-foreground">ElectioLab — Terminal de Inteligência Eleitoral</span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <Link href="/metodologia" className="hover:text-foreground transition-colors">Metodologia</Link>
            <span>·</span>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
