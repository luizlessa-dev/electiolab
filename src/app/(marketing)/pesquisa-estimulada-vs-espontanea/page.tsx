import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, GitCompare } from "lucide-react";
import { LeiaTabem } from "@/components/editorial/leia-tambem";

export const metadata: Metadata = {
  title: {
    absolute: "Pesquisa Estimulada vs Espontânea — Diferença e Quando Usar | ElectioLab",
  },
  description:
    "Diferença entre pesquisa estimulada (cartão com nomes) e espontânea (entrevistado fala) em pesquisa eleitoral. Por que candidatos pouco conhecidos somem na espontânea e voto útil aparece só na estimulada.",
  alternates: { canonical: "https://electiolab.com/pesquisa-estimulada-vs-espontanea" },
  openGraph: {
    title: "Pesquisa Estimulada vs Espontânea — Diferença",
    description:
      "Por que candidatos pouco conhecidos somem na espontânea e voto útil aparece só na estimulada.",
    url: "https://electiolab.com/pesquisa-estimulada-vs-espontanea",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const FAQ = [
  {
    q: "Qual a diferença entre pesquisa estimulada e espontânea?",
    a: "Estimulada: o entrevistador mostra um cartão (ou lê uma lista) com os nomes dos candidatos antes de perguntar em quem vai votar. Espontânea: o entrevistado fala o nome de quem lembra, sem nenhuma ajuda. A diferença muda o resultado drasticamente, especialmente para candidatos menos conhecidos.",
  },
  {
    q: "Por que candidatos pouco conhecidos somem na pesquisa espontânea?",
    a: "Na espontânea, o entrevistado precisa lembrar do nome do candidato — depende de notoriedade. Candidatos com pouco capital midiático (Aldo Rebelo, Augusto Cury, etc.) podem ter <1% na espontânea mas 5-8% na estimulada quando o nome aparece no cartão.",
  },
  {
    q: "Qual pesquisa é mais 'correta', estimulada ou espontânea?",
    a: "Nenhuma é mais correta isoladamente — medem coisas diferentes. Espontânea mede saliência (quem o eleitor lembra). Estimulada mede preferência declarada quando todos os nomes estão à disposição. Estimulada se aproxima mais da urna (onde também há lista). Espontânea sinaliza fragilidade do candidato com baixa notoriedade.",
  },
  {
    q: "Brancos, nulos e indecisos aparecem nas duas?",
    a: "Sim. Em ambas, o entrevistado pode dizer 'branco/nulo' ou 'não sei/não respondeu'. Geralmente o percentual de indecisos é MAIOR na espontânea (porque não há cartão pra ajudar), e MENOR na estimulada (a lista força a escolher).",
  },
  {
    q: "Voto útil aparece na pesquisa?",
    a: "Voto útil aparece principalmente na estimulada e no segundo turno. Eleitor que apoia candidato pequeno na espontânea pode migrar pro candidato mais competitivo do mesmo campo na estimulada quando vê a lista completa. Por isso a estimulada tende a inflar candidatos top e esvaziar candidatos médios.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://electiolab.com/pesquisa-estimulada-vs-espontanea#article",
      headline: "Pesquisa Estimulada vs Espontânea — Diferença e Quando Usar",
      description:
        "Diferença entre pesquisa estimulada (cartão) e espontânea (sem cartão) em pesquisa eleitoral.",
      url: "https://electiolab.com/pesquisa-estimulada-vs-espontanea",
      mainEntityOfPage: "https://electiolab.com/pesquisa-estimulada-vs-espontanea",
      author: { "@id": "https://electiolab.com/sobre#founder" },
      publisher: { "@id": "https://electiolab.com/#organization" },
      datePublished: "2026-05-19",
      dateModified: new Date().toISOString().slice(0, 10),
      inLanguage: "pt-BR",
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
        {
          "@type": "ListItem",
          position: 2,
          name: "Glossário",
          item: "https://electiolab.com/glossario-pesquisa-eleitoral",
        },
        { "@type": "ListItem", position: 3, name: "Estimulada vs espontânea" },
      ],
    },
  ],
};

export default function EstimuladaEspontaneaPage() {
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
            href="/dashboard"
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium"
          >
            Acessar Terminal
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <article>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <GitCompare className="h-3.5 w-3.5" />
            <span>Glossário · Estimulada vs Espontânea</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Pesquisa estimulada vs espontânea
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            O mesmo candidato pode aparecer com 45% numa pesquisa e 12% em outra publicadas na
            mesma semana, pelo mesmo instituto, com a mesma amostra. A culpa não é nem do
            instituto nem do candidato — é da pergunta. Pesquisa <strong>estimulada</strong> e{" "}
            <strong>espontânea</strong> medem coisas diferentes, e entender essa diferença
            evita interpretações desastrosas.
          </p>

          {/* Definição */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">A diferença na prática</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-card p-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Estimulada</p>
                <p className="text-sm leading-relaxed">
                  O entrevistador mostra um <strong>cartão com a lista de candidatos</strong>{" "}
                  (ou lê em voz alta) antes da pergunta. O entrevistado escolhe entre os nomes
                  apresentados.
                </p>
                <p className="text-xs text-muted-foreground italic">
                  &quot;Vou ler nomes de possíveis candidatos. Em qual deles o(a) sr(a) votaria?&quot;
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Espontânea</p>
                <p className="text-sm leading-relaxed">
                  Nenhuma lista é mostrada. O entrevistado <strong>diz o nome de quem lembra</strong>{" "}
                  espontaneamente, sem qualquer ajuda visual ou auditiva do entrevistador.
                </p>
                <p className="text-xs text-muted-foreground italic">
                  &quot;Se a eleição fosse hoje, em quem o(a) sr(a) votaria pra presidente?&quot;
                </p>
              </div>
            </div>
          </section>

          {/* Por que os números variam */}
          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold">Por que os números são tão diferentes</h2>
            <p className="text-sm leading-relaxed">
              Na espontânea, o eleitor precisa <strong>recuperar o nome da memória</strong>.
              Quem tem mais notoriedade midiática (Lula, Bolsonaro) sai bem; candidatos com
              capital de imagem pequeno simplesmente são esquecidos. Tarcísio, Caiado, Zema
              tendem a ter votos consistentes na estimulada mas somem na espontânea — não
              porque o eleitor não os apoia, mas porque não lembra deles na hora da pergunta.
            </p>
            <p className="text-sm leading-relaxed">
              Na estimulada, com a lista à frente, o eleitor faz uma <strong>escolha entre as
              opções apresentadas</strong>. O resultado se aproxima mais da urna, onde o
              eleitor também vê os nomes ou números dos candidatos no painel.
            </p>
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-semibold">Exemplo ilustrativo (pesquisa típica)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left pb-2 font-semibold">Candidato</th>
                      <th className="text-right pb-2 font-semibold">Estimulada</th>
                      <th className="text-right pb-2 font-semibold">Espontânea</th>
                      <th className="text-right pb-2 font-semibold">Diferença</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono tabular-nums">
                    <tr className="border-t border-border/40">
                      <td className="py-2">Lula</td>
                      <td className="text-right py-2">39%</td>
                      <td className="text-right py-2">35%</td>
                      <td className="text-right py-2 text-muted-foreground">−4pp</td>
                    </tr>
                    <tr className="border-t border-border/40 bg-muted/15">
                      <td className="py-2">Flávio Bolsonaro</td>
                      <td className="text-right py-2">36%</td>
                      <td className="text-right py-2">28%</td>
                      <td className="text-right py-2 text-muted-foreground">−8pp</td>
                    </tr>
                    <tr className="border-t border-border/40">
                      <td className="py-2">Caiado</td>
                      <td className="text-right py-2">4%</td>
                      <td className="text-right py-2">1%</td>
                      <td className="text-right py-2 text-muted-foreground">−3pp</td>
                    </tr>
                    <tr className="border-t border-border/40 bg-muted/15">
                      <td className="py-2">Indecisos/Brancos</td>
                      <td className="text-right py-2">11%</td>
                      <td className="text-right py-2">28%</td>
                      <td className="text-right py-2 text-emerald-400">+17pp</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Note como os indecisos quase triplicam na espontânea — sem a lista, mais
                gente diz &quot;não sei&quot; ou &quot;branco&quot;. O peso de cada candidato sobre os votos
                válidos não muda tanto, mas a base muda muito.
              </p>
            </div>
          </section>

          {/* Quando usar cada uma */}
          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold">Quando cada uma é útil</h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-semibold mb-1">Estimulada</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Estima melhor o <strong>resultado provável da urna</strong> em eleição próxima.
                  Os institutos usam estimulada como referência principal nas pesquisas finais
                  (D−7) e nas projeções de 2º turno.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-semibold mb-1">Espontânea</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Mede <strong>saliência política</strong> — quanto da população lembra do nome.
                  Útil pra detectar candidatos com baixa notoriedade que precisam investir em
                  exposição midiática. Também é mais resistente ao &quot;voto útil&quot; — mostra
                  preferência original sem influência da lista.
                </p>
              </div>
            </div>
          </section>

          {/* Erros comuns */}
          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold">Como evitar erros de leitura</h2>
            <ul className="space-y-2 text-sm leading-relaxed list-disc pl-5">
              <li>
                Sempre <strong>verifique qual tipo</strong> de pesquisa está sendo apresentado.
                A maioria dos releases dos institutos publica ambas — e algumas reportagens
                mesclam números de uma e de outra sem aviso.
              </li>
              <li>
                <strong>Não compare estimulada de um instituto com espontânea de outro.</strong>{" "}
                Os números não são comparáveis. O ElectioLab agrega apenas pesquisas estimuladas
                ao calcular a média ponderada — espontâneas servem como sinal complementar.
              </li>
              <li>
                <strong>&quot;Tendência de crescimento&quot; precisa ser do mesmo tipo.</strong> Candidato
                que subiu de 4% (espontânea, semana 1) para 8% (estimulada, semana 2) não cresceu
                — apenas a pergunta mudou.
              </li>
              <li>
                <strong>Cuidado com manchetes &quot;sem o nome de Lula, X lidera&quot;.</strong> Em
                pesquisa espontânea isso é trivial (basta Lula não ser lembrado por alguns).
                O cenário hipotético precisa ser estimulado pra ter significado.
              </li>
            </ul>
          </section>

          {/* FAQ */}
          <section className="space-y-3 mt-12">
            <h2 className="text-xl font-bold">Perguntas frequentes</h2>
            <div className="space-y-2">
              {FAQ.map((f, i) => (
                <details
                  key={i}
                  className="border border-border rounded-lg bg-card overflow-hidden group"
                >
                  <summary className="cursor-pointer px-5 py-3.5 text-sm font-medium hover:text-primary transition-colors list-none flex items-center justify-between gap-3">
                    {f.q}
                    <span className="text-muted-foreground text-xs shrink-0 group-open:rotate-180 transition-transform">
                      ▾
                    </span>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                    {f.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Próximo */}
          <section className="mt-10 pt-6 border-t border-border">
            <p className="text-sm font-semibold mb-3">Continue lendo</p>
            <Link
              href="/pesquisa-presencial-vs-online"
              className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-all p-4"
            >
              <div>
                <p className="text-sm font-bold group-hover:text-primary transition-colors">
                  Pesquisa presencial vs telefônica vs online
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Como a metodologia de coleta muda o resultado (e os vieses de cada uma)
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>
          </section>
        <LeiaTabem current="/pesquisa-estimulada-vs-espontanea" />
        </article>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Glossário de pesquisa eleitoral · Dados: TSE
        </div>
      </footer>
    </div>
  );
}
