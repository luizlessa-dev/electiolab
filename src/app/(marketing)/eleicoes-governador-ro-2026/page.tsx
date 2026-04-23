import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador RO 2026 — Marcos Rogério Lidera | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador de Rondônia 2026. Marcos Rogério (PL) 38,9%, Léo Moraes (Podemos) 20,2%, Adailton Fúria (PSD) 18,8% — Veritá mar/2026.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-ro-2026" },
  openGraph: {
    title: "Pesquisas Governador RO 2026 — Marcos Rogério Lidera | ElectioLab",
    description: "Marcos Rogério (PL) 38,9%, Léo Moraes (Podemos) 20,2% — Veritá mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-ro-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Marcos Rogério",  party: "PL",      pct: 38.9 },
  { name: "Léo Moraes",      party: "Podemos", pct: 20.2 },
  { name: "Adailton Fúria",  party: "PSD",     pct: 18.8 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador de Rondônia em 2026?",
    answer: "Marcos Rogério (PL), senador por Rondônia, lidera com 38,9% na Veritá (mar/2026). Léo Moraes (Podemos), deputado federal, aparece em segundo com 20,2% e Adailton Fúria (PSD) com 18,8%. A Paraná Pesquisas (abr/2026) confirmou Marcos Rogério na liderança com 36,3%. Com 18 pp de vantagem sobre os perseguidores, Marcos Rogério é o favorito na disputa pelo governo de Rondônia.",
  },
  {
    question: "Por que Marcos Rogério é favorito ao governo de Rondônia?",
    answer: "Marcos Rogério (PL) é senador por Rondônia há dois mandatos e tem forte presença no campo conservador-bolsonarista, majoritário no estado. Rondônia é um dos estados mais alinhados ao PL/Bolsonaro no Brasil — o partido elegeu os dois deputados federais com maior votação do estado em 2022. A saída de Marcos Rogério do Senado para disputar o governo em 2026 seria a maior aposta de sua carreira.",
  },
  {
    question: "Quem é Léo Moraes e qual sua força em Rondônia?",
    answer: "Léo Moraes (Podemos) é deputado federal por Rondônia, conhecido pela atuação em pauta de segurança pública e defesa dos servidores estaduais. Com 20,2% nas pesquisas, é o principal candidato de oposição ao campo bolsonarista. Sua candidatura tenta unificar eleitores de centro que buscam alternativa à polarização PL vs. PT — mas o espaço ainda é limitado em Rondônia, onde o conservadorismo é hegemônico.",
  },
  {
    question: "Qual o papel do agronegócio e da pecuária na política de Rondônia?",
    answer: "Rondônia é o 5º maior produtor nacional de bovinos e tem economia fortemente baseada na soja, café robusta e pecuária. O estado integra o MATOPIBA ampliado da Amazônia Legal e suas questões eleitorais passam pelo uso da terra, demarcação indígena e preservação ambiental. Candidatos com posição favorável ao agro e à segurança do produtor rural têm vantagem natural num eleitorado historicamente conservador.",
  },
  {
    question: "Quando é a eleição para governador de Rondônia em 2026?",
    answer: "A eleição para governador de Rondônia ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). Rondônia tem aproximadamente 1,2 milhão de eleitores. O estado é o mais dinâmico do Norte em crescimento econômico recente — PIB cresceu acima da média nacional nos últimos 5 anos — e a questão do desenvolvimento sustentável vs. expansão agropecuária é central nos debates eleitorais.",
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

export default function GovernadorRO2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Rondônia · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador RO 2026 — Marcos Rogério 38,9% Lidera</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Veritá (mar/2026): Marcos Rogério (PL) 38,9%, Léo Moraes (Podemos) 20,2%,
            Adailton Fúria (PSD) 18,8%. Paraná Pesquisas (abr/2026) confirma liderança com 36,3%.
            Senador favorito em estado fortemente conservador.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Instituto Veritá · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Presencial</span>
              <span className="text-xs font-mono text-muted-foreground">Mar/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 45) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: Instituto Veritá · Cenário estimulado, 1º turno</p>
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
              { label: "Governador PA 2026", href: "/eleicoes-governador-pa-2026" },
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
