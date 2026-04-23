import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador AC 2026 — Alan Rick Favorito | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Acre 2026. Alan Rick (União) 44,5%, Tião Bocalom (PSDB) 24,1%, Mailza Assis (PP) 17,6% — Paraná Pesquisas set/2025.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-ac-2026" },
  openGraph: {
    title: "Pesquisas Governador AC 2026 — Alan Rick Favorito | ElectioLab",
    description: "Alan Rick (União) 44,5%, Tião Bocalom (PSDB) 24,1% — Paraná Pesquisas set/2025.",
    url: "https://electiolab.com/eleicoes-governador-ac-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Alan Rick",      party: "União Brasil", pct: 44.5 },
  { name: "Tião Bocalom",   party: "PSDB",         pct: 24.1 },
  { name: "Mailza Assis",   party: "PP",           pct: 17.6 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Acre em 2026?",
    answer: "Alan Rick (União Brasil), senador pelo Acre, lidera com 44,5% na Paraná Pesquisas (set/2025). Tião Bocalom (PSDB), atual prefeito de Rio Branco, aparece em segundo com 24,1% e Mailza Assis (PP) com 17,6%. A diferença de 20,4 pp coloca Alan Rick em posição confortável — é o cenário mais favorável ao campo conservador-religioso no estado, que elegeu Gladson Cameli por dois mandatos.",
  },
  {
    question: "Por que Gladson Cameli não disputa a reeleição no Acre?",
    answer: "Gladson Cameli (PP) governou o Acre por dois mandatos (2019–2026) e está impedido de se reeleger. Concluirá o mandato em dezembro de 2026. O campo conservador aposta em Alan Rick — senador federal e nome de maior projeção do campo conservador acreano — para manter o estado. A saída de Cameli abre uma corrida em que o campo governista parte na frente, mas sem a vantagem de incumbência.",
  },
  {
    question: "Quem é Alan Rick e qual sua relação com o Acre?",
    answer: "Alan Rick (União Brasil) é senador pelo Acre e pastor evangélico — perfil que combina base religiosa com articulação política em Brasília. Foi deputado federal antes de chegar ao Senado. Com 44,5% nas pesquisas, a candidatura ao governo estadual seria o passo natural de sua carreira. Alan Rick é próximo de Gladson Cameli e deve herdar boa parte da estrutura política do governador atual.",
  },
  {
    question: "Qual o papel do campo evangélico na política do Acre?",
    answer: "O Acre tem uma das maiores proporções de eleitores evangélicos do Brasil — estima-se entre 30% e 35% do eleitorado. Em eleições estaduais, a articulação das igrejas neopentecostais e pentecostais tem peso decisivo. Alan Rick (pastor evangélico) e Mailza Assis (perfil conservador) disputam essa fatia, enquanto Tião Bocalom concentra o voto urbano de Rio Branco. A disputa pela liderança evangélica é um dos eixos centrais da corrida acreana.",
  },
  {
    question: "Quando é a eleição para governador do Acre em 2026?",
    answer: "A eleição para governador do Acre ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O Acre tem aproximadamente 600 mil eleitores — um dos menores colégios eleitorais do Brasil. O estado faz fronteira com Peru e Bolívia, e questões de segurança de fronteira, extração de borracha e desenvolvimento sustentável da Amazônia são temas recorrentes nas campanhas eleitorais acreanas.",
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

export default function GovernadorAC2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Acre · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador AC 2026 — Alan Rick 44,5% Favorito</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Paraná Pesquisas (set/2025): Alan Rick (União) 44,5%,
            Tião Bocalom (PSDB) 24,1%, Mailza Assis (PP) 17,6%.
            Com Gladson Cameli impedido, campo conservador aposta no senador evangélico.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Paraná Pesquisas · Set/2025</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Presencial · Dado mais recente disponível</span>
              <span className="text-xs font-mono text-muted-foreground">Set/2025</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 50) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: Paraná Pesquisas · Cenário estimulado, 1º turno</p>
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
              { label: "Governador AM 2026", href: "/eleicoes-governador-am-2026" },
              { label: "Governador RO 2026", href: "/eleicoes-governador-ro-2026" },
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
