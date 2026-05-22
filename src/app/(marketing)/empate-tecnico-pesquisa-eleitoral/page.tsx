import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Equal } from "lucide-react";

export const metadata: Metadata = {
  title: {
    absolute: "Empate Técnico em Pesquisa Eleitoral — O Que Significa | ElectioLab",
  },
  description:
    "Empate técnico não é empate literal. Entenda quando dois candidatos estão tecnicamente empatados em uma pesquisa eleitoral, como o ElectioLab classifica cenários e por que a manchete às vezes engana.",
  alternates: { canonical: "https://electiolab.com/empate-tecnico-pesquisa-eleitoral" },
  openGraph: {
    title: "Empate Técnico em Pesquisa Eleitoral — O Que Significa",
    description:
      "Quando dois candidatos estão tecnicamente empatados e por que a manchete às vezes engana.",
    url: "https://electiolab.com/empate-tecnico-pesquisa-eleitoral",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const FAQ = [
  {
    q: "Empate técnico é a mesma coisa que empate?",
    a: "Não. Empate técnico significa que dois candidatos têm números diferentes mas o intervalo de confiança da pesquisa não permite afirmar quem está à frente. Empate literal seria os dois com o mesmo número (ex.: 45×45). Em empate técnico, um pode estar com 45 e o outro com 43,7 — estatisticamente indistinguíveis.",
  },
  {
    q: "Como saber se uma pesquisa indica empate técnico?",
    a: "Calcula-se o intervalo de confiança 95% de cada candidato (% ± margem). Se os intervalos se sobrepõem em qualquer ponto, é empate técnico. Exemplo: Lula 39% ±3 (faixa 36–42) e Flávio 36% ±3 (faixa 33–39). A faixa 36–39 é compartilhada — empate técnico.",
  },
  {
    q: "Manchete diz 'X lidera por 3 pontos' mas pesquisa está em empate técnico. Quem está certo?",
    a: "A manchete está tecnicamente errada se a margem de erro for ±3pp ou maior. 'Liderar por 3 pontos' com margem de ±3pp significa que a vantagem real pode ser de 6pp ou de zero — dentro da margem, não há liderança estatística. A formulação correta seria 'X aparece numericamente à frente, mas dentro da margem de erro'.",
  },
  {
    q: "Como o ElectioLab classifica empate técnico?",
    a: "No cálculo de cenários de 2º turno, classificamos como empate técnico quando o IC 95% do líder se sobrepõe ao IC do segundo colocado. Quando o líder vence com folga > 2pp acima do limite superior do segundo, classificamos como 'vantagem'. Acima disso, 'folga clara'. Cenários com menos de 3 pesquisas viram 'poucos dados' por insuficiência estatística.",
  },
  {
    q: "Pesquisa em empate técnico significa que a eleição será apertada?",
    a: "Não necessariamente. Empate técnico no momento da pesquisa indica que os candidatos estão próximos NAQUELA semana — mas eleição é dinâmica. Pode virar nas semanas seguintes. A história eleitoral brasileira tem casos de empate técnico em julho que viraram 60×40 em outubro (Dilma 2010, FHC 1994), e casos de liderança ampla que virou empate técnico (Aécio 2014).",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://electiolab.com/empate-tecnico-pesquisa-eleitoral#article",
      headline: "Empate Técnico em Pesquisa Eleitoral — O Que Significa",
      description:
        "Empate técnico não é empate. Como interpretar quando dois candidatos estão estatisticamente empatados.",
      url: "https://electiolab.com/empate-tecnico-pesquisa-eleitoral",
      mainEntityOfPage: "https://electiolab.com/empate-tecnico-pesquisa-eleitoral",
      author: { "@id": "https://electiolab.com/sobre#founder" },
      publisher: { "@id": "https://electiolab.com/#organization" },
      datePublished: "2026-05-19",
      dateModified: new Date().toISOString().slice(0, 10),
      inLanguage: "pt-BR",
      about: { "@type": "DefinedTerm", name: "Empate técnico" },
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
        { "@type": "ListItem", position: 3, name: "Empate técnico" },
      ],
    },
  ],
};

export default function EmpateTecnicoPage() {
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
            <Equal className="h-3.5 w-3.5" />
            <span>Glossário · Empate Técnico</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Empate técnico em pesquisa eleitoral
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            &quot;Empate técnico&quot; é uma das expressões mais lidas e menos compreendidas do
            jornalismo eleitoral brasileiro. Não significa empate literal — significa que a
            pesquisa não consegue distinguir quem está à frente, mesmo com números diferentes.
            Aqui explicamos o que isso significa na prática e como identificar o cenário.
          </p>

          {/* Definição */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">A definição em uma frase</h2>
            <p className="text-sm leading-relaxed">
              <strong>Empate técnico</strong> ocorre quando dois candidatos têm percentuais
              diferentes em uma pesquisa, mas seus <strong>intervalos de confiança de 95%</strong>{" "}
              (resultado ± margem de erro) se sobrepõem. Estatisticamente, qualquer um dos dois
              pode estar à frente na realidade — a pesquisa não tem precisão suficiente pra
              afirmar.
            </p>
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-semibold">Exemplo real do 2º turno presidencial 2026</p>
              <div className="font-mono text-sm space-y-1">
                <p>Flávio Bolsonaro: <strong>45,0%</strong> ± 3pp → IC: 42,0 a 48,0</p>
                <p>Lula:             <strong>43,7%</strong> ± 3pp → IC: 40,7 a 46,7</p>
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  Faixa compartilhada: 42,0 a 46,7 (4,7pp de sobreposição) → empate técnico
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Flávio aparece com 1,3pp à frente — mas qualquer ponto entre 42 e 46,7 é
                possível pra <strong>ambos</strong>. A pesquisa não consegue dizer quem vence.
              </p>
            </div>
          </section>

          {/* Como detectar */}
          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold">Como saber se dois candidatos estão empatados tecnicamente</h2>
            <p className="text-sm leading-relaxed">A regra é simples:</p>
            <ol className="space-y-2 text-sm leading-relaxed list-decimal pl-5">
              <li>Pegue o % do líder e subtraia a margem de erro → limite inferior do líder.</li>
              <li>Pegue o % do segundo e some a margem de erro → limite superior do segundo.</li>
              <li>
                Se <strong>limite superior do 2º ≥ limite inferior do líder</strong>, os intervalos
                se sobrepõem = empate técnico.
              </li>
            </ol>
            <div className="rounded-lg border border-border bg-card p-5 space-y-2">
              <p className="text-sm font-semibold">Atalho mental</p>
              <p className="text-sm leading-relaxed">
                Diferença entre os candidatos &gt; <strong>2 × margem de erro</strong> → <strong>vantagem clara</strong>.
                <br />
                Diferença ≤ 2 × margem → <strong>empate técnico</strong>.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Exemplo: pesquisa com margem ±3pp. Se diferença entre candidatos for &lt; 6pp, é
                empate técnico. Se &gt; 6pp, vantagem.
              </p>
            </div>
          </section>

          {/* Erros comuns */}
          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold">Por que manchetes erram com tanta frequência</h2>
            <p className="text-sm leading-relaxed">
              A maioria das manchetes ignora o empate técnico por uma razão simples:{" "}
              <strong>&quot;Flávio lidera por 1,3pp&quot;</strong> é mais clicável que{" "}
              <strong>&quot;Flávio e Lula em empate técnico&quot;</strong>. Mas as duas formas dizem
              a mesma coisa estatística — só que a primeira induz o leitor a achar que existe
              vantagem real.
            </p>
            <p className="text-sm leading-relaxed">
              Casos típicos em que a manchete escorrega:
            </p>
            <ul className="space-y-2 text-sm leading-relaxed list-disc pl-5">
              <li>
                <strong>Diferença de 2-3pp tratada como liderança.</strong> Quase sempre é
                empate técnico em pesquisas brasileiras (margem ±2 a ±3pp).
              </li>
              <li>
                <strong>&quot;Tendência de alta&quot; sem comparar com margem.</strong> Candidato sobe de
                36% pra 38% entre pesquisas seguintes do mesmo instituto = está dentro da margem,
                não é tendência.
              </li>
              <li>
                <strong>Comparar pesquisas de institutos diferentes</strong> sem considerar que
                metodologias distintas podem gerar 3-5pp de diferença sistemática, mesmo na
                mesma semana.
              </li>
            </ul>
          </section>

          {/* Como o ElectioLab usa */}
          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold">Como o ElectioLab classifica cenários</h2>
            <p className="text-sm leading-relaxed">
              Na nossa página de <Link href="/quem-vence-no-segundo-turno-presidencia-2026" className="text-primary hover:underline">cenários de 2º turno</Link>,
              classificamos cada par de candidatos automaticamente:
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-[1fr_2fr] text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                <div className="px-4 py-2 font-semibold">Status</div>
                <div className="px-4 py-2 font-semibold">Critério</div>
              </div>
              {[
                ["Empate técnico", "IC do líder se sobrepõe ao IC do 2º colocado"],
                ["Vantagem", "Líder à frente, mas folga < 2pp acima do IC do 2º"],
                ["Folga clara", "Folga > 2pp acima do IC do 2º colocado"],
                ["Poucos dados", "Menos de 3 pesquisas no cenário"],
              ].map((row, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[1fr_2fr] text-sm border-b border-border/30 last:border-0 ${
                    i % 2 ? "bg-muted/15" : ""
                  }`}
                >
                  <div className="px-4 py-2.5 font-semibold">{row[0]}</div>
                  <div className="px-4 py-2.5 text-muted-foreground">{row[1]}</div>
                </div>
              ))}
            </div>
            <p className="text-sm leading-relaxed">
              Essa classificação aparece como badge colorido em cada cenário da página,
              evitando a leitura ambígua que manchetes tradicionais geram.
            </p>
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
              href="/pesquisa-estimulada-vs-espontanea"
              className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-all p-4"
            >
              <div>
                <p className="text-sm font-bold group-hover:text-primary transition-colors">
                  Pesquisa estimulada vs espontânea
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Por que o mesmo candidato aparece com 45% e 12% na mesma pesquisa
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>
          </section>
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
