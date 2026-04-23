import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Presidenciais 2026 — Média Agregada | ElectioLab" },
  description:
    "Acompanhe a média agregada de todas as pesquisas presidenciais de 2026. Dados de Datafolha, Quaest, Atlas Intel e outros institutos. Atualizado semanalmente.",
  alternates: { canonical: "https://electiolab.com/pesquisas-presidenciais-2026" },
  openGraph: {
    title: "Pesquisas Presidenciais 2026 — Média Agregada | ElectioLab",
    description:
      "Acompanhe a média agregada de todas as pesquisas presidenciais de 2026. Dados de Datafolha, Quaest, Atlas Intel e outros institutos. Atualizado semanalmente.",
    url: "https://electiolab.com/pesquisas-presidenciais-2026",
  },
};

const FAQ_ITEMS = [
  {
    question: "Quais institutos fazem pesquisas presidenciais 2026?",
    answer:
      "Os principais institutos que realizam pesquisas presidenciais 2026 são Datafolha, Quaest (incluindo Genial/Quaest), Atlas Intel, Ipec, PoderData e outros registrados no TSE. Cada instituto utiliza metodologias distintas — presencial, telefônica ou online — e publica com frequências variadas. O ElectioLab monitora e agrega todas as pesquisas registradas para fornecer uma visão consolidada da corrida presidencial.",
  },
  {
    question: "Com que frequência as pesquisas presidenciais 2026 são publicadas?",
    answer:
      "A frequência varia por instituto. Em geral, Datafolha e Quaest publicam pesquisas a cada uma ou duas semanas durante o período eleitoral. Atlas Intel publica com maior frequência, frequentemente semanal ou até mais. PoderData e outros institutos têm cadência mensal ou bimensal. O ElectioLab atualiza a média agregada sempre que uma nova pesquisa é publicada.",
  },
  {
    question: "Qual candidato lidera as pesquisas presidenciais 2026?",
    answer:
      "A posição atual de cada candidato nas pesquisas presidenciais 2026 está disponível no dashboard do ElectioLab com a média ponderada atualizada. Em vez de depender de uma única pesquisa — que pode ser um outlier —, o dashboard exibe a tendência agregada de todos os institutos, ponderada por recência, tamanho de amostra, metodologia e histórico de acurácia. Acesse o dashboard para ver o líder atual.",
  },
  {
    question: "Como funciona a média ponderada das pesquisas?",
    answer:
      "A média ponderada do ElectioLab considera quatro fatores para cada pesquisa: (1) Recência — pesquisas mais antigas decaem com meia-vida de 10 dias; (2) Tamanho da amostra — amostras maiores têm mais peso, com retorno decrescente calculado via raiz quadrada do n; (3) Metodologia de coleta — presencial supera telefônica, que supera online; (4) Histórico de acurácia do instituto — institutos com menor Erro Médio Absoluto em eleições anteriores recebem peso maior. O resultado é uma estimativa mais estável do que qualquer pesquisa individual.",
  },
  {
    question: "As pesquisas presidenciais 2026 são confiáveis?",
    answer:
      "Pesquisas individuais têm margem de erro e variações metodológicas que podem gerar leituras distorcidas. Um instituto pode apontar 39% enquanto outro diz 33% para o mesmo candidato na mesma semana — ambos dentro de suas margens de erro. A agregação de pesquisas, método usado pelo FiveThirtyEight nos EUA e pelo ElectioLab no Brasil, reduz esse ruído ao combinar múltiplas fontes com pesos diferenciados. O resultado é significativamente mais confiável do que qualquer pesquisa isolada para identificar a tendência real da corrida presidencial.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function PesquisasPresidenciais2026Page() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Header */}
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16 space-y-16">

        {/* Hero */}
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-primary">
            Pesquisas Presidenciais 2026
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Média Agregada de Pesquisas Presidenciais 2026
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            O ElectioLab consolida todas as pesquisas presidenciais publicadas em 2026 — Datafolha,
            Quaest, Atlas Intel, PoderData e outros — em uma única média ponderada. Cada pesquisa
            recebe um peso baseado em quatro fatores: recência, tamanho da amostra, metodologia de
            coleta e histórico de acurácia do instituto. O resultado é uma estimativa mais estável e
            confiável do que qualquer pesquisa individual.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Ver média ao vivo →
          </Link>
        </div>

        {/* FAQ */}
        <section className="space-y-4" id="faq">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Perguntas frequentes
            </h2>
          </div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="border border-border rounded-sm bg-card overflow-hidden group"
              >
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center justify-between gap-3">
                  {item.question}
                  <span className="text-muted-foreground text-xs shrink-0 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="border border-border rounded-sm bg-card px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Dados ao vivo no Dashboard</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Acompanhe a média ponderada atualizada, tendência histórica e ranking de acurácia dos
              institutos em tempo real.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir dashboard
          </Link>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            ElectioLab — Terminal de Inteligência Eleitoral
          </span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <Link href="/sobre" className="hover:text-foreground transition-colors">
              Metodologia
            </Link>
            <span>·</span>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
