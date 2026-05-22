import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: {
    absolute: "Pesquisa Presencial vs Telefônica vs Online — Diferenças | ElectioLab",
  },
  description:
    "Diferenças entre pesquisa presencial, telefônica, online e mista em pesquisa eleitoral. Vieses de cada metodologia, custo, alcance e como o ElectioLab pondera cada uma na média agregada.",
  alternates: { canonical: "https://electiolab.com/pesquisa-presencial-vs-online" },
  openGraph: {
    title: "Pesquisa Presencial vs Telefônica vs Online — Diferenças",
    description:
      "Vieses de cada metodologia e como o ElectioLab pondera cada uma na média ponderada.",
    url: "https://electiolab.com/pesquisa-presencial-vs-online",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const FAQ = [
  {
    q: "Qual é a metodologia mais confiável em pesquisa eleitoral?",
    a: "Presencial historicamente tem menor erro vs urna no Brasil — alcança eleitores de baixa escolaridade e baixa renda que metodologias remotas não acessam bem. Mas é a mais cara. Telefônica e online são alternativas mais baratas com vieses conhecidos (sub-representação de idosos no online, de jovens no telefônico). Mista (face a face + online ou telefônica) tenta compensar os vieses.",
  },
  {
    q: "Por que pesquisa online sub-representa idosos?",
    a: "Pesquisas online geralmente recrutam respondentes em painéis pré-cadastrados, redes sociais ou pop-ups em sites. Eleitores idosos têm menor presença nessas plataformas e taxa de conclusão menor — o resultado é uma amostra que sobre-representa eleitores 18-44 anos e sub-representa 60+. Bons institutos ajustam o peso por demografia, mas o ajuste tem limite.",
  },
  {
    q: "Pesquisa telefônica ainda funciona?",
    a: "Funciona com restrição. Penetração de celular no Brasil é universal, mas taxa de resposta a chamadas de números desconhecidos caiu muito na última década — está em ~3-5% em algumas pesquisas. Isso multiplica o esforço (precisa ligar muito mais pra completar a amostra) e gera viés (quem atende é diferente de quem não atende).",
  },
  {
    q: "Como o ElectioLab pondera cada metodologia?",
    a: "Na média ponderada, multiplicamos cada pesquisa por um peso de metodologia: presencial = 1,00 · telefônica = 0,85 · mista = 0,75 · online = 0,60. Os valores refletem o histórico de erro vs resultado oficial em eleições brasileiras anteriores, com presencial entregando consistentemente os menores desvios.",
  },
  {
    q: "Pesquisa eleitoral por WhatsApp é confiável?",
    a: "WhatsApp não é metodologia reconhecida pelo TSE pra pesquisa registrada. O que existem são pesquisas online distribuídas via WhatsApp como canal de recrutamento — e nesse caso vale a mesma crítica da online: viés de plataforma. Atlas Intel é um dos institutos que usam recrutamento via redes sociais/messaging com sucesso, mas ainda assim trata-se de pesquisa online ajustada, não 'pesquisa por WhatsApp'.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://electiolab.com/pesquisa-presencial-vs-online#article",
      headline: "Pesquisa Presencial vs Telefônica vs Online — Diferenças",
      description:
        "Comparativo entre metodologias de pesquisa eleitoral: presencial, telefônica, online e mista.",
      url: "https://electiolab.com/pesquisa-presencial-vs-online",
      mainEntityOfPage: "https://electiolab.com/pesquisa-presencial-vs-online",
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
        { "@type": "ListItem", position: 3, name: "Presencial vs online" },
      ],
    },
  ],
};

export default function PresencialOnlinePage() {
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
            <Phone className="h-3.5 w-3.5" />
            <span>Glossário · Metodologia de Coleta</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Pesquisa presencial vs telefônica vs online
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            A forma como uma pesquisa coleta os dados — alguém batendo na porta, ligação no
            celular, formulário no Facebook — afeta o resultado tanto quanto a pergunta em si.
            Cada metodologia carrega vieses diferentes. Quem entende essas diferenças interpreta
            melhor por que dois institutos publicam números distintos na mesma semana.
          </p>

          {/* Tabela comparativa */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Comparativo direto</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Metodologia</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Alcance</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Custo</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Viés principal</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Peso EL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/40">
                    <td className="px-4 py-3 font-semibold">Presencial</td>
                    <td className="px-4 py-3 text-muted-foreground">Domicílios + pontos de fluxo</td>
                    <td className="px-4 py-3 text-muted-foreground">Alto</td>
                    <td className="px-4 py-3 text-muted-foreground">Menor — alcança baixa renda</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">1,00</td>
                  </tr>
                  <tr className="border-t border-border/40 bg-muted/15">
                    <td className="px-4 py-3 font-semibold">Telefônica</td>
                    <td className="px-4 py-3 text-muted-foreground">Celular + fixo</td>
                    <td className="px-4 py-3 text-muted-foreground">Médio</td>
                    <td className="px-4 py-3 text-muted-foreground">Sub-representa jovens</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">0,85</td>
                  </tr>
                  <tr className="border-t border-border/40">
                    <td className="px-4 py-3 font-semibold">Mista</td>
                    <td className="px-4 py-3 text-muted-foreground">Presencial + online/telefônica</td>
                    <td className="px-4 py-3 text-muted-foreground">Médio-alto</td>
                    <td className="px-4 py-3 text-muted-foreground">Tenta compensar (depende da mix)</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">0,75</td>
                  </tr>
                  <tr className="border-t border-border/40 bg-muted/15">
                    <td className="px-4 py-3 font-semibold">Online</td>
                    <td className="px-4 py-3 text-muted-foreground">Painel + redes sociais</td>
                    <td className="px-4 py-3 text-muted-foreground">Baixo</td>
                    <td className="px-4 py-3 text-muted-foreground">Sub-representa idosos e baixa renda</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">0,60</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Peso EL = multiplicador usado pelo ElectioLab na média ponderada. Reflete histórico
              de erro vs resultado oficial em eleições brasileiras anteriores. Detalhes em{" "}
              <Link href="/sobre" className="text-primary hover:underline">como funciona</Link>.
            </p>
          </section>

          {/* Detalhe por metodologia */}
          <section className="space-y-6 mt-10">
            <h2 className="text-xl font-bold">Detalhe de cada metodologia</h2>

            <div className="rounded-lg border border-border bg-card p-5 space-y-2">
              <h3 className="text-base font-bold">Presencial</h3>
              <p className="text-sm leading-relaxed">
                Entrevistadores se deslocam fisicamente até domicílios ou pontos de fluxo
                (rodoviárias, mercados) com um questionário em papel ou tablet. É a metodologia
                histórica do IBOPE, Datafolha clássico e Vox Brasil. Alcança eleitores que outras
                metodologias não alcançam — donas de casa, idosos, eleitores rurais sem internet
                ou celular ativo.
              </p>
              <p className="text-sm leading-relaxed">
                <strong>Pontos fortes:</strong> menor erro vs urna em eleições brasileiras;
                profundidade de questionário (entrevistas de 10-15 min são viáveis); melhor
                cobertura geográfica e socioeconômica.
              </p>
              <p className="text-sm leading-relaxed">
                <strong>Pontos fracos:</strong> caro (R$ 80-120/entrevista); lento (semanas de
                campo); risco de viés de entrevistador (quem decide bater na porta de quem).
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 space-y-2">
              <h3 className="text-base font-bold">Telefônica</h3>
              <p className="text-sm leading-relaxed">
                Discagem aleatória (Random Digit Dialing — RDD) ou painel de números pré-cadastrados.
                Foi popular nos anos 2000-2015, perdeu força com a queda de taxa de atendimento.
                Hoje raramente é a metodologia principal — usada mais como complemento na mista.
              </p>
              <p className="text-sm leading-relaxed">
                <strong>Vieses:</strong> sub-representação de jovens (que não atendem chamadas
                desconhecidas) e super-representação de aposentados em casa de dia. Pesquisas
                feitas só por celular pegam diferente das feitas por fixo (geração + nível
                socioeconômico).
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 space-y-2">
              <h3 className="text-base font-bold">Online</h3>
              <p className="text-sm leading-relaxed">
                Pesquisa via formulário web, distribuído por painel pré-cadastrado, anúncio em
                redes sociais, pop-up em sites parceiros ou app dedicado. Atlas Intel popularizou
                no Brasil com bons resultados no 2T 2018 e 2022.
              </p>
              <p className="text-sm leading-relaxed">
                <strong>Vieses:</strong> sub-representação de idosos (60+) e de baixa renda sem
                internet ou letramento digital. Auto-seleção: quem entra no painel não é
                aleatório. Bons institutos compensam com pesos demográficos pós-coleta, mas
                limita-se ao que está representado na base inicial.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 space-y-2">
              <h3 className="text-base font-bold">Mista</h3>
              <p className="text-sm leading-relaxed">
                Combinação de duas ou mais metodologias na mesma pesquisa. Ex.: 60% das
                entrevistas presenciais + 40% online; ou presencial em cidades pequenas +
                telefônica em capitais. Tenta combinar pontos fortes e compensar vieses,
                mas adiciona complexidade de ponderação.
              </p>
              <p className="text-sm leading-relaxed">
                Genial/Quaest e Ipespe usam mista frequentemente. A qualidade depende da
                fórmula de combinação — se mal calibrada, pode amplificar vieses em vez de
                compensar.
              </p>
            </div>
          </section>

          {/* O que isso importa pro leitor */}
          <section className="space-y-4 mt-10">
            <h2 className="text-xl font-bold">Como usar essa informação ao ler uma pesquisa</h2>
            <ol className="space-y-3 text-sm leading-relaxed list-decimal pl-5">
              <li>
                <strong>Sempre verifique a metodologia.</strong> Aparece no rodapé do release ou
                na ficha técnica registrada no PesqEle/TSE. Cada metodologia pinta o mesmo
                eleitorado de forma um pouco diferente.
              </li>
              <li>
                <strong>Compare pesquisas da mesma metodologia se possível.</strong> Datafolha
                presencial vs Vox Brasil presencial é uma comparação mais limpa que Datafolha
                presencial vs Atlas online.
              </li>
              <li>
                <strong>Pesquisa online &quot;abrasileirada&quot; ≠ pesquisa nacional.</strong> Mesmo com
                ajuste demográfico, a base inicial impõe limites. Esquerda urbana jovem tende a
                aparecer melhor online; direita rural idosa, na presencial.
              </li>
              <li>
                <strong>Mista exige cuidado com a composição.</strong> &quot;Mista&quot; pode significar 90%
                presencial + 10% online (próximo de presencial) ou 30%/70% (próximo de online).
                Sem saber a proporção, fica difícil interpretar.
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

          {/* Próximo */}
          <section className="mt-10 pt-6 border-t border-border">
            <p className="text-sm font-semibold mb-3">Continue lendo</p>
            <Link
              href="/glossario-pesquisa-eleitoral"
              className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-all p-4"
            >
              <div>
                <p className="text-sm font-bold group-hover:text-primary transition-colors">
                  Voltar ao glossário
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ver todos os termos de pesquisa eleitoral
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
