import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador TO 2026 — Professora Dorinha Lidera | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Tocantins 2026. Professora Dorinha (União) 35%, Laurez Moreira (PSD) 18% — Real Time Big Data mar/2026.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-to-2026" },
  openGraph: {
    title: "Pesquisas Governador TO 2026 — Professora Dorinha Lidera | ElectioLab",
    description: "Professora Dorinha (União) 35%, Laurez Moreira (PSD) 18% — Real Time Big Data mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-to-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Professora Dorinha", party: "União Brasil", pct: 35.0 },
  { name: "Laurez Moreira",     party: "PSD",          pct: 18.0 },
  { name: "Vicentinho Júnior",  party: "PSDB",         pct: 12.0 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Tocantins em 2026?",
    answer: "Professora Dorinha (União Brasil), senadora federal pelo Tocantins, lidera com 35% das intenções de voto no Real Time Big Data (23–24 mar/2026, 1.600 entrevistados, ±2 pp). Laurez Moreira (PSD), vice-governadora, aparece com 18% e Vicentinho Júnior (PSDB) com 12%. A Paraná Pesquisas (ago/2025) também apontou Dorinha na frente com 36,7%.",
  },
  {
    question: "Por que Wanderlei Barbosa não disputa a reeleição no Tocantins?",
    answer: "Wanderlei Barbosa (Republicanos) governou o Tocantins por dois mandatos consecutivos e está impedido de se reeleger. Concluirá o mandato em dezembro de 2026. Sua vice-governadora, Laurez Moreira (PSD), é candidata natural à sucessão — mas enfrenta a liderança de Dorinha nas pesquisas. Barbosa não anunciou candidatura ao Senado ou à Câmara até a publicação desta página.",
  },
  {
    question: "Quem é Professora Dorinha e qual sua força no Tocantins?",
    answer: "Dora Nascimento — a Professora Dorinha (União Brasil) — é senadora pelo Tocantins e ex-deputada federal reconhecida pela atuação na área de educação. Com 35% nas pesquisas, parte como favorita numa corrida onde nenhum candidato tem posição dominante. Sua base eleitoral nas cidades menores do interior tocantinense, somada à estrutura do União Brasil, é o principal ativo de sua candidatura.",
  },
  {
    question: "Qual a importância da disputa pelo governo do Tocantins?",
    answer: "O Tocantins é o estado mais jovem do Brasil (criado em 1988) e faz parte da fronteira agrícola do MATOPIBA — região de expansão do agronegócio entre Maranhão, Tocantins, Piauí e Bahia. Em 2026, o resultado estadual tem impacto direto na distribuição de recursos do agro, na política ambiental da Amazônia legal e na composição do Congresso eleito pela região Norte-Centro.",
  },
  {
    question: "Quando é a eleição para governador do Tocantins em 2026?",
    answer: "A eleição para governador do Tocantins ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O Tocantins tem aproximadamente 1,1 milhão de eleitores — o menor colégio eleitoral entre os estados do Norte. A capital Palmas, com 350 mil habitantes, concentra boa parte do eleitorado e costuma ser o termômetro mais confiável para o resultado estadual.",
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

export default function GovernadorTO2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Tocantins · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador TO 2026 — Dorinha 35% Lidera Campo Aberto</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Real Time Big Data (23–24 mar/2026, 1.600 entrevistados, ±2 pp): Professora Dorinha (União) 35%,
            Laurez Moreira (PSD) 18%, Vicentinho Júnior (PSDB) 12%.
            Com Wanderlei Barbosa impedido, corrida em aberto no estado mais jovem do Brasil.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Real Time Big Data · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.600 entrevistados · ±2,0 pp · telefônica</span>
              <span className="text-xs font-mono text-muted-foreground">23–24 mar/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 40) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: Real Time Big Data · Cenário estimulado, 1º turno</p>
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
