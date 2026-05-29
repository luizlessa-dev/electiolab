import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { LeiaTabem } from "@/components/editorial/leia-tambem";

export const metadata: Metadata = {
  title: {
    absolute: "Margem de Erro em Pesquisa Eleitoral — O Que Significa | ElectioLab",
  },
  description:
    "O que é margem de erro em pesquisa eleitoral, como ler ±2pp ou ±3pp, o que é intervalo de confiança 95% e por que dois candidatos podem estar em empate técnico mesmo com números diferentes.",
  alternates: { canonical: "https://electiolab.com/margem-de-erro-pesquisa-eleitoral" },
  openGraph: {
    title: "Margem de Erro em Pesquisa Eleitoral — O Que Significa",
    description:
      "Como ler ±2pp/±3pp, intervalo de confiança 95% e quando dois candidatos estão em empate técnico.",
    url: "https://electiolab.com/margem-de-erro-pesquisa-eleitoral",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const FAQ = [
  {
    q: "O que significa margem de erro de ±3pp em uma pesquisa eleitoral?",
    a: "Significa que o número publicado pode estar até 3 pontos percentuais acima ou abaixo do valor real, com 95% de confiança. Se Lula aparece com 39% e a margem é ±3pp, o número real provavelmente está entre 36% e 42%.",
  },
  {
    q: "Por que a margem de erro é maior em pesquisas com amostra menor?",
    a: "A margem de erro depende do tamanho da amostra: pesquisas com 500 entrevistados têm margem maior (±4,4pp) do que pesquisas com 2.000 entrevistados (±2,2pp). Quanto maior a amostra, menor o erro, mas o ganho é decrescente — dobrar a amostra não dobra a precisão.",
  },
  {
    q: "O que é nível de confiança de 95% em pesquisa eleitoral?",
    a: "Significa que se a mesma pesquisa fosse repetida 100 vezes com amostras diferentes, em 95 dessas vezes o resultado ficaria dentro do intervalo de margem. Não significa que o número publicado tem 95% de chance de estar correto — é uma propriedade estatística do método, não do resultado individual.",
  },
  {
    q: "Margem de erro é a mesma coisa que intervalo de confiança?",
    a: "São conceitos relacionados mas diferentes. A margem de erro é a metade da largura do intervalo de confiança. Se a margem é ±3pp e o candidato tem 40%, o intervalo de confiança 95% é 37%–43%. O intervalo é a faixa; a margem é a 'meia-faixa'.",
  },
  {
    q: "Como o ElectioLab usa a margem de erro?",
    a: "A média ponderada do ElectioLab combina pesquisas com pesos diferentes baseados em quatro fatores, incluindo o tamanho da amostra. Pesquisas com amostras maiores (e margem de erro menor) recebem peso proporcional à raiz quadrada do tamanho da amostra. Isso reduz o ruído de pesquisas com margem alta sem fazer pesquisas gigantes dominarem o cálculo.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://electiolab.com/margem-de-erro-pesquisa-eleitoral#article",
      headline: "Margem de Erro em Pesquisa Eleitoral — O Que Significa",
      description:
        "Como ler margem de erro, intervalo de confiança e empate técnico em pesquisa eleitoral.",
      url: "https://electiolab.com/margem-de-erro-pesquisa-eleitoral",
      mainEntityOfPage: "https://electiolab.com/margem-de-erro-pesquisa-eleitoral",
      author: { "@id": "https://electiolab.com/sobre#founder" },
      publisher: { "@id": "https://electiolab.com/#organization" },
      datePublished: "2026-05-19",
      dateModified: new Date().toISOString().slice(0, 10),
      inLanguage: "pt-BR",
      about: { "@type": "DefinedTerm", name: "Margem de erro" },
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
        { "@type": "ListItem", position: 3, name: "Margem de erro" },
      ],
    },
  ],
};

export default function MargemErroPage() {
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
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Glossário · Margem de Erro</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Margem de erro em pesquisa eleitoral
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            Toda pesquisa eleitoral séria publica um número discreto no rodapé:{" "}
            <strong>&quot;margem de erro de ±3 pontos percentuais&quot;</strong>. Esse número é
            mais importante que o resultado da pesquisa — é o que separa interpretação séria
            de chute. Aqui explicamos o que ele significa e como ler corretamente.
          </p>

          {/* Conceito principal */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">O conceito em uma frase</h2>
            <p className="text-sm leading-relaxed">
              <strong>Margem de erro</strong> é quanto o número publicado pode estar acima ou
              abaixo do valor real, com nível de confiança de 95% — ou seja, em 95 a cada 100
              pesquisas similares feitas com amostras diferentes, o resultado ficaria nessa faixa.
            </p>
            <div className="rounded-lg border border-border bg-card p-5 space-y-2">
              <p className="text-sm font-semibold">Exemplo prático</p>
              <p className="text-sm leading-relaxed">
                Datafolha publica:{" "}
                <span className="font-mono">Lula 39%</span> ·{" "}
                <span className="font-mono">Flávio 36%</span> · margem ±3pp.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Tradução: o Lula real está entre <strong>36% e 42%</strong>; o Flávio real está
                entre <strong>33% e 39%</strong>. Os intervalos se sobrepõem (entre 36% e 39%),
                então <strong>esse cenário é empate técnico</strong> mesmo a manchete dizendo
                &quot;Lula lidera por 3 pontos&quot;.
              </p>
            </div>
          </section>

          {/* Por que a margem varia */}
          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold">Por que pesquisa A tem margem ±2pp e B tem ±4pp</h2>
            <p className="text-sm leading-relaxed">
              A margem de erro depende do <strong>tamanho da amostra</strong>. Quanto mais
              entrevistados, menor a margem — mas com retorno decrescente: o ganho de adicionar
              mil entrevistados é maior numa amostra pequena do que numa grande.
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                <div className="px-4 py-2 font-semibold">Amostra (n)</div>
                <div className="px-4 py-2 font-semibold text-right">Margem (±pp)</div>
                <div className="px-4 py-2 font-semibold">Custo aprox</div>
              </div>
              {[
                ["500", "±4,4", "baixo"],
                ["1.000", "±3,1", "médio"],
                ["2.000", "±2,2", "alto"],
                ["4.000", "±1,5", "muito alto"],
              ].map((row, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-3 text-sm border-b border-border/30 last:border-0 ${
                    i % 2 ? "bg-muted/15" : ""
                  }`}
                >
                  <div className="px-4 py-2.5 font-mono">{row[0]}</div>
                  <div className="px-4 py-2.5 font-mono text-right">{row[1]}</div>
                  <div className="px-4 py-2.5 text-muted-foreground">{row[2]}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Valores aproximados para nível de confiança 95% com proporção esperada em torno de
              50%. A fórmula exata é{" "}
              <code className="font-mono text-[11px] bg-muted/40 px-1.5 py-0.5 rounded">
                margem = 1,96 × √(p(1−p)/n)
              </code>{" "}
              onde p é a proporção esperada (usa-se 0,5 como pior caso) e n é o tamanho da amostra.
            </p>
          </section>

          {/* Empate técnico */}
          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold">Empate técnico: o que isso significa</h2>
            <p className="text-sm leading-relaxed">
              <strong>Empate técnico</strong> não é empate literal. É a situação em que dois
              candidatos têm números diferentes mas seus intervalos de confiança se sobrepõem.
              Estatisticamente, qualquer um dos dois pode estar à frente — a pesquisa não consegue
              distinguir.
            </p>
            <p className="text-sm leading-relaxed">
              No 2º turno presidencial 2026, por exemplo, Flávio Bolsonaro aparece com 45% e Lula
              com 43,7% — diferença de 1,3pp. Com margem típica de ±3pp em ambos os candidatos, os
              intervalos vão de <strong>42–48 para Flávio</strong> e <strong>40,7–46,7 para Lula</strong>.
              A faixa de sobreposição é gigantesca (42–46,7). Isso é empate técnico clássico.
            </p>
            <p className="text-sm leading-relaxed">
              Detalhe importante: <strong>não confundir empate técnico com empate real</strong>.
              Manchetes que dizem &quot;empate em 45×43,7&quot; estão erradas. O correto é &quot;dentro da
              margem de erro&quot; ou &quot;estatisticamente empatados&quot;.
            </p>
            <p className="text-sm leading-relaxed">
              Para análise detalhada de empate técnico, veja{" "}
              <Link href="/empate-tecnico-pesquisa-eleitoral" className="text-primary hover:underline">
                empate técnico em pesquisa eleitoral
              </Link>
              .
            </p>
          </section>

          {/* Erros comuns */}
          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold">Erros comuns ao ler margem de erro</h2>
            <ol className="space-y-3 text-sm leading-relaxed list-decimal pl-5">
              <li>
                <strong>Tratar a margem como margem &quot;extra&quot; de cada candidato.</strong> A
                margem é <em>do número</em>, não do candidato. Cada candidato tem o seu próprio
                intervalo. Não é &quot;Lula 39 ± 3 e Flávio 36 ± 3, então a diferença é 3 ± 6&quot;.
              </li>
              <li>
                <strong>Ignorar o nível de confiança.</strong> Quase todas as pesquisas brasileiras
                usam 95% como padrão. Em raros casos com 90% (margem menor publicada), o intervalo
                fica mais estreito mas a probabilidade de erro é maior.
              </li>
              <li>
                <strong>Achar que pesquisa errou se o número real ficou fora da margem.</strong>{" "}
                Mesmo pesquisa bem-feita erra 5% das vezes (intervalo 95%). Não é defeito do método,
                é parte da definição.
              </li>
              <li>
                <strong>Comparar pesquisas com margens diferentes sem ajuste.</strong> Pesquisa A
                com ±2pp e pesquisa B com ±4pp não são equivalentes — A é &quot;mais precisa&quot;.
                Por isso o ElectioLab pondera pelo tamanho da amostra.
              </li>
            </ol>
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

          <LeiaTabem current="/margem-de-erro-pesquisa-eleitoral" />
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
