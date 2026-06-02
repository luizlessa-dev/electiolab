import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3, ArrowRight, BookOpen } from "lucide-react";
import { LeiaTabem } from "@/components/editorial/leia-tambem";

export const metadata: Metadata = {
  title: {
    absolute: "As pesquisas eleitorais erraram em 2022? | ElectioLab",
  },
  description:
    "No 1º turno de 2022 a maioria das pesquisas subestimou a direita; no 2º turno acertaram o vencedor. O que aconteceu, por que, e o que mudou para 2026.",
  alternates: {
    canonical: "https://electiolab.com/pesquisas-erraram-2022",
  },
  openGraph: {
    title: "As pesquisas eleitorais erraram em 2022?",
    description:
      "1º turno subestimou a direita; 2º turno acertou o vencedor. O que aconteceu e o que mudou para 2026.",
    url: "https://electiolab.com/pesquisas-erraram-2022",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const FAQ = [
  {
    q: "As pesquisas eleitorais erraram em 2022?",
    a: "Parcialmente. No 1º turno de 2022, a maioria das pesquisas subestimou o desempenho de Jair Bolsonaro e dos candidatos de direita, errando para fora da margem de erro em vários casos. No 2º turno, acertaram o vencedor (Lula), embora tendessem a superestimar sua vantagem. Foi um erro de calibração, não um colapso do método.",
  },
  {
    q: "Por que as pesquisas subestimaram Bolsonaro em 2022?",
    a: "As hipóteses mais discutidas pelos próprios institutos: (1) sub-representação do eleitorado bolsonarista em amostras (especialmente online e telefônicas), (2) eleitores que evitavam declarar voto em Bolsonaro a entrevistadores ('voto envergonhado'), (3) tabelas de ponderação demográfica defasadas e (4) maior abstenção/comparecimento diferente do previsto. Não houve uma causa única.",
  },
  {
    q: "As pesquisas acertaram o 2º turno de 2022?",
    a: "Sim, na direção. A maioria das pesquisas finais apontou Lula à frente, e Lula venceu. O erro foi de magnitude: muitas projetaram uma vantagem maior do que os cerca de 1,8 ponto percentual do resultado final. Acertar o vencedor e errar a margem são coisas diferentes.",
  },
  {
    q: "Agregação de pesquisas teria errado menos em 2022?",
    a: "A leitura agregada — a média de muitos institutos — ficou mais próxima do resultado do que pesquisas isoladas, e é mais robusta a outliers. Mas se TODOS os institutos compartilham o mesmo viés (como a subestimação da direita no 1º turno), a média também carrega esse viés. Por isso o ElectioLab pondera por acurácia histórica: institutos que erraram mais em 2018 e 2022 recebem peso menor.",
  },
  {
    q: "O que mudou nas pesquisas para 2026?",
    a: "Vários institutos revisaram ponderação demográfica e mix de metodologia após 2022. O ElectioLab incorpora a acurácia de 2018 e 2022 no peso de cada instituto e sinaliza pesquisas defasadas. A recomendação permanece: acompanhe a média ponderada e a tendência, não uma pesquisa isolada.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://electiolab.com/pesquisas-erraram-2022#article",
      headline: "As pesquisas eleitorais erraram em 2022?",
      description:
        "Análise do desempenho das pesquisas em 2022: subestimação da direita no 1º turno, acerto do vencedor no 2º turno, e o que mudou para 2026.",
      url: "https://electiolab.com/pesquisas-erraram-2022",
      mainEntityOfPage: "https://electiolab.com/pesquisas-erraram-2022",
      author: { "@id": "https://electiolab.com/sobre#founder" },
      publisher: { "@id": "https://electiolab.com/#organization" },
      datePublished: "2026-06-01",
      dateModified: new Date().toISOString().slice(0, 10),
      inLanguage: "pt-BR",
      keywords: [
        "pesquisas erraram 2022",
        "pesquisas eleitorais 2022",
        "datafolha errou 2022",
        "acurácia pesquisas 2022",
        "pesquisas subestimaram Bolsonaro",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
        { "@type": "ListItem", position: 2, name: "Glossário", item: "https://electiolab.com/glossario-pesquisa-eleitoral" },
        { "@type": "ListItem", position: 3, name: "As pesquisas erraram em 2022?" },
      ],
    },
  ],
};

export default function PesquisasErraram2022Page() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/glossario-pesquisa-eleitoral" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>Glossário</span>
          </Link>
          <Link
            href="/instituto-mais-acurado-eleicoes-brasil"
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium"
          >
            Ranking de acurácia →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-14">

        {/* Hero — answer-first */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <Link href="/glossario-pesquisa-eleitoral" className="hover:text-foreground transition-colors">
              Glossário de pesquisa eleitoral
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            As pesquisas eleitorais erraram em 2022?
          </h1>
          <div className="border-l-2 border-primary pl-4 py-1">
            <p className="text-base text-foreground leading-relaxed">
              <strong>Resposta curta: parcialmente.</strong> No 1º turno de 2022, a maioria das
              pesquisas subestimou Jair Bolsonaro e a direita — em vários casos para fora da margem
              de erro. No 2º turno, acertaram o vencedor (Lula), mas superestimaram sua vantagem.
              Foi um erro de calibração, não o fim do método: a leitura agregada e por acurácia
              histórica é a resposta.
            </p>
          </div>
        </section>

        {/* 1º turno */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">1º turno: a subestimação da direita</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No 1º turno de 2022, boa parte dos levantamentos finais apontou Lula com vantagem maior
            e, em alguns casos, perto de vencer no 1º turno. O resultado mostrou uma disputa bem
            mais apertada, com Bolsonaro acima do que as pesquisas indicavam e um bom desempenho de
            candidatos de direita ao Congresso e governos estaduais. Vários institutos erraram para
            fora da margem de erro — um sinal de viés sistemático, não só de acaso amostral.
          </p>
        </section>

        {/* Por que */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">Por que aconteceu</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Não houve causa única. As hipóteses mais discutidas pelos próprios institutos:
          </p>
          <div className="space-y-3">
            {[
              ["Sub-representação do eleitorado bolsonarista", "Amostras — sobretudo online e telefônicas — captavam menos esse grupo do que seu peso real nas urnas."],
              ["Voto envergonhado", "Parte dos eleitores evitava declarar voto em Bolsonaro a entrevistadores, distorcendo a estimulada."],
              ["Ponderação demográfica defasada", "Tabelas de calibração por renda, escolaridade e região nem sempre refletiam o eleitorado de 2022."],
              ["Comparecimento diferente do previsto", "Modelos de eleitor provável e abstenção não anteciparam bem quem efetivamente foi votar."],
            ].map(([t, d]) => (
              <div key={t} className="border border-border rounded-sm p-4 space-y-1">
                <p className="text-sm font-semibold">{t}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 2º turno */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">2º turno: acertaram o vencedor, erraram a margem</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No 2º turno, a maioria das pesquisas finais apontou Lula à frente — e Lula venceu, por
            cerca de 1,8 ponto percentual. O acerto foi na direção; o erro foi de magnitude, já que
            muitas projetavam uma diferença maior. Acertar quem ganha e errar por quanto são
            avaliações diferentes — e é por isso que o{" "}
            <Link href="/instituto-mais-acurado-eleicoes-brasil" className="text-primary hover:underline">
              ranking de acurácia
            </Link>{" "}
            mede o erro médio absoluto, não só o palpite do vencedor.
          </p>
        </section>

        {/* O que mudou */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">O que mudou para 2026</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Depois de 2022, vários institutos revisaram ponderação demográfica e o mix de
            metodologias. Do lado da leitura, a lição é clara: a média ponderada de muitos
            institutos é mais robusta que qualquer pesquisa isolada — mas só se corrigir pelo
            histórico de cada um. O ElectioLab incorpora a acurácia de 2018 e 2022 no peso de cada
            instituto, penaliza pesquisas online em relação às presenciais e sinaliza dados
            defasados. Veja a{" "}
            <Link href="/metodologia" className="text-primary hover:underline">metodologia</Link>{" "}
            e o histórico em{" "}
            <Link href="/eleicao-2022" className="text-primary hover:underline">eleição 2022</Link>.
          </p>
        </section>

        {/* FAQ */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Perguntas Frequentes</h2>
          <div className="space-y-5">
            {FAQ.map((item) => (
              <div key={item.q} className="space-y-1">
                <h3 className="text-sm font-semibold">{item.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4 pb-2">
          <p className="text-sm text-muted-foreground">
            Acompanhe 2026 pela média ponderada, corrigida pela acurácia de cada instituto.
          </p>
          <Link
            href="/pesquisas-presidenciais-2026"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            Ver médias presidenciais 2026 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        <section className="max-w-3xl mx-auto px-4 pb-4">
          <LeiaTabem current="/pesquisas-erraram-2022" />
        </section>

      </main>

      <footer className="border-t border-border py-6 px-4">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <Link href="/" className="flex items-center gap-2 hover:text-foreground transition-colors">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="font-mono">ElectioLab</span>
          </Link>
          <div className="flex flex-wrap gap-4">
            {[
              { href: "/glossario-pesquisa-eleitoral", label: "Glossário" },
              { href: "/instituto-mais-acurado-eleicoes-brasil", label: "Acurácia" },
              { href: "/eleicao-2022", label: "Eleição 2022" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
