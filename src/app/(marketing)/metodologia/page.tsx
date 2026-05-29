import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3, Clock, Users, FlaskConical, Building2, ArrowRight, Calculator, BookOpen } from "lucide-react";
import { LeiaTabem } from "@/components/editorial/leia-tambem";

export const metadata: Metadata = {
  title: {
    absolute: "Metodologia ElectioLab — Como Calculamos a Média Ponderada | ElectioLab",
  },
  description:
    "Documentação completa da metodologia de ponderação do ElectioLab: recência (meia-vida 10 dias), tamanho amostral (√n), metodologia de coleta (presencial > online) e acurácia histórica dos institutos. Auditável e open-source.",
  alternates: { canonical: "https://electiolab.com/metodologia" },
  openGraph: {
    title: "Metodologia ElectioLab — Como Calculamos a Média Ponderada",
    description:
      "Documentação técnica completa: recência, amostra, metodologia e acurácia. Como o ElectioLab cancela o ruído de pesquisas isoladas.",
    url: "https://electiolab.com/metodologia",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const FAQ = [
  {
    q: "Como o ElectioLab calcula a média ponderada das pesquisas?",
    a: "Cada pesquisa recebe um peso final W = Wr × Wa × Wm × Wi, onde Wr é o fator de recência (decaimento exponencial com meia-vida de 10 dias), Wa é o fator amostral (√n / 1000), Wm é o fator metodológico (presencial 1,0; telefônica 0,8; mista 0,7; online 0,6) e Wi é o score de acurácia histórica do instituto. A média ponderada final é a soma dos votos × peso, dividida pela soma dos pesos.",
  },
  {
    q: "O que é meia-vida de 10 dias na fórmula de recência?",
    a: "Meia-vida de 10 dias significa que uma pesquisa feita há 10 dias tem peso 50% menor que uma publicada hoje; uma de 20 dias tem peso 25% do valor original. A fórmula exata é Wr = e^(-t × ln(2) / 10), onde t é o número de dias desde a publicação. Pesquisas muito antigas (>45 dias) têm peso residual quase nulo.",
  },
  {
    q: "Por que o ElectioLab usa √n em vez de n direto para ponderar pelo tamanho amostral?",
    a: "O erro padrão de uma proporção cai na proporção de 1/√n. Dobrar a amostra de 1.000 para 2.000 entrevistados não dobra a precisão — reduz o erro em fator √2 ≈ 1,41. Usar n direto supervalorizaria pesquisas gigantes (5.000+ entrevistados) em detrimento de boas pesquisas menores. A raiz quadrada reflete a redução real de incerteza.",
  },
  {
    q: "Por que pesquisas presenciais pesam mais do que online?",
    a: "Metodologias de coleta têm vieses estruturais diferentes. Pesquisas online sub-representam eleitores sem smartphone e sem acesso digital (em 2026, ainda 28% dos eleitores brasileiros acima de 55 anos). Presenciais — com cotas geográficas e socioeconômicas — têm melhor cobertura do eleitorado real. Isso é calibrado pelo fator Wm: presencial 1,0, telefônica 0,8, mista 0,7, online 0,6.",
  },
  {
    q: "Como o ElectioLab calcula o score de acurácia histórica dos institutos?",
    a: "O score é baseado no Erro Médio Absoluto (MAE) entre a última projeção pré-eleitoral do instituto e o resultado oficial do TSE, para eleições de 2018 e 2022. Eleições mais recentes recebem peso maior (2022 > 2018). O MAE é convertido em score de 0 a 1 — um instituto com MAE médio de 1,0 pp recebe score próximo de 1,0; um com MAE de 5,0 pp recebe score em torno de 0,6.",
  },
  {
    q: "A metodologia do ElectioLab é auditável?",
    a: "Sim. O código de ponderação está documentado e o lógica de cálculo está disponível via API pública em /api/v1/averages. Todas as pesquisas individuais com seus metadados (instituto, data, amostra, metodologia) são acessíveis em /api/v1/polls. Qualquer pesquisador pode replicar o cálculo com os dados brutos.",
  },
  {
    q: "Com que frequência a média é recalculada?",
    a: "As médias ponderadas são recalculadas automaticamente a cada 6 horas via cron. Quando uma nova pesquisa é aprovada, o recálculo é disparado imediatamente. O fator de recência Wr é recalculado a cada ciclo com a data atual — ou seja, mesmo sem novas pesquisas, pesos de pesquisas antigas decaem continuamente.",
  },
  {
    q: "O que são 'house effects' e como o ElectioLab lida com eles?",
    a: "House effects são vieses sistemáticos de institutos específicos — tendência consistente de superestimar ou subestimar determinado candidato em relação ao resultado real. O ElectioLab não corrige house effects diretamente na fórmula atual (isso inflaria complexidade sem ganho proporcional para eleições brasileiras com muitos institutos), mas o score de acurácia histórica penaliza indiretamente institutos com desvios sistemáticos maiores.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://electiolab.com/metodologia#article",
      headline: "Metodologia ElectioLab — Como Calculamos a Média Ponderada de Pesquisas Eleitorais",
      description:
        "Documentação técnica completa da metodologia de ponderação do ElectioLab: fórmulas, parâmetros e justificativas para cada fator.",
      url: "https://electiolab.com/metodologia",
      mainEntityOfPage: "https://electiolab.com/metodologia",
      author: { "@id": "https://electiolab.com/sobre#founder" },
      publisher: { "@id": "https://electiolab.com/#organization" },
      datePublished: "2026-05-27",
      dateModified: new Date().toISOString().slice(0, 10),
      inLanguage: "pt-BR",
      about: [
        { "@type": "DefinedTerm", name: "Média ponderada" },
        { "@type": "DefinedTerm", name: "Agregação de pesquisas eleitorais" },
        { "@type": "DefinedTerm", name: "Decaimento exponencial" },
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
        { "@type": "ListItem", position: 2, name: "Sobre", item: "https://electiolab.com/sobre" },
        { "@type": "ListItem", position: 3, name: "Metodologia", item: "https://electiolab.com/metodologia" },
      ],
    },
  ],
};

export default function MetodologiaPage() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>ElectioLab</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium"
          >
            Ver as médias →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-16">

        {/* Hero */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Documentação técnica</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Metodologia ElectioLab
          </h1>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Como Calculamos a Média Ponderada de Pesquisas Eleitorais
          </p>
          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
            O ElectioLab agrega pesquisas eleitorais usando uma média ponderada por quatro fatores independentes.
            Esta página documenta as fórmulas, os parâmetros escolhidos e as justificativas
            para cada decisão metodológica. Auditável, replicável, sem caixa preta.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/sobre" className="text-xs text-primary hover:underline flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> Sobre o projeto
            </Link>
            <Link href="/pesquisas-presidenciais-2026" className="text-xs text-primary hover:underline flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> Ver médias ao vivo
            </Link>
            <Link href="/imprensa" className="text-xs text-primary hover:underline flex items-center gap-1">
              <ArrowRight className="h-3 w-3" /> API pública
            </Link>
          </div>
        </section>

        {/* Visão geral */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Uma pesquisa eleitoral isolada tem dois problemas fundamentais: variância amostral e
            viés metodológico. A variância aparece como margem de erro (±2–4 pp) — mesmo que
            o instituto não cometa erro algum, a amostra aleatória pode diferir da população real.
            O viés emerge de escolhas metodológicas: presencial vs. online, horário da coleta,
            forma de ponderação demográfica.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ao combinar múltiplas pesquisas com pesos diferenciados, esses erros se cancelam
            parcialmente — o ruído aleatório de uma pesquisa não está correlacionado com o ruído
            de outra, então a média é mais estável que qualquer pesquisa individual. O FiveThirtyEight
            demonstrou esse princípio nas eleições americanas desde 2008. O ElectioLab aplica
            a mesma lógica ao contexto eleitoral brasileiro.
          </p>

          {/* Fórmula geral */}
          <div className="border border-border rounded-sm p-5 bg-card space-y-3">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Fórmula de peso</p>
            <code className="block text-sm font-mono text-primary bg-primary/10 p-3 rounded-sm">
              W = Wr × Wa × Wm × Wi
            </code>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {[
                { sym: "Wr", label: "Recência (decaimento temporal)" },
                { sym: "Wa", label: "Tamanho amostral (√n)" },
                { sym: "Wm", label: "Metodologia de coleta" },
                { sym: "Wi", label: "Acurácia histórica do instituto" },
              ].map((r) => (
                <div key={r.sym} className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">{r.sym}</span>
                  <span className="text-muted-foreground">{r.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              A média ponderada final de um candidato:{" "}
              <code className="text-primary">M = Σ(voto_i × W_i) / Σ(W_i)</code>
            </p>
          </div>
        </section>

        {/* Fator 1: Recência */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <h2 className="text-xl font-bold tracking-tight">Fator 1 — Recência</h2>
          </div>
          <div className="border border-border rounded-sm p-4 bg-card space-y-2">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Fórmula</p>
            <code className="block text-sm font-mono text-primary bg-primary/10 p-2 rounded-sm">
              Wr = e^(−t × ln(2) / 10)
            </code>
            <p className="text-xs text-muted-foreground">onde <code className="text-primary">t</code> = dias desde a data de publicação</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O decaimento exponencial com <strong className="text-foreground">meia-vida de 10 dias</strong> é o coração do modelo.
            Uma pesquisa publicada há 10 dias tem peso 50% menor que uma publicada hoje.
            Uma de 20 dias tem peso 25%. Uma de 30 dias, 12,5%. Após 45 dias, o peso
            residual é inferior a 5% — a pesquisa ainda está no modelo mas com influência mínima.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A meia-vida de 10 dias foi calibrada para o ritmo eleitoral brasileiro: institutos
            grandes (Datafolha, Quaest) publicam a cada 1–2 semanas durante o ciclo eleitoral.
            Uma meia-vida mais curta (5 dias) tornaria o modelo volátil demais; mais longa (20 dias)
            deixaria pesquisas antigas pesando excessivamente em momentos de virada de campanha.
          </p>

          <div className="bg-muted/30 rounded-sm p-4 space-y-2">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Exemplo</p>
            <div className="grid grid-cols-3 gap-px bg-border rounded-sm overflow-hidden text-xs font-mono">
              {[
                ["Publicada há", "Wr", "Peso relativo"],
                ["0 dias", "1,000", "100%"],
                ["7 dias", "0,616", "61,6%"],
                ["10 dias", "0,500", "50,0%"],
                ["20 dias", "0,250", "25,0%"],
                ["30 dias", "0,125", "12,5%"],
                ["45 dias", "0,044", "4,4%"],
              ].map(([a, b, c], i) => (
                <div key={i} className={`bg-card px-3 py-2 ${i === 0 ? "text-muted-foreground uppercase tracking-wider" : ""}`}>
                  {i === 0 ? a : a}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-px bg-border rounded-sm overflow-hidden text-xs font-mono">
              {[
                ["Publicada há", "Wr", "Peso relativo"],
                ["0 dias", "1,000", "100%"],
                ["7 dias", "0,616", "61,6%"],
                ["10 dias", "0,500", "50,0%"],
                ["20 dias", "0,250", "25,0%"],
                ["30 dias", "0,125", "12,5%"],
                ["45 dias", "0,044", "4,4%"],
              ].map(([a, b, c], i) => (
                <div key={`b-${i}`} className={`bg-card px-3 py-2 ${i === 0 ? "text-muted-foreground" : i % 2 === 0 ? "text-primary" : ""}`}>{b}</div>
              ))}
            </div>
          </div>
        </section>

        {/* Fator 2: Amostra */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary shrink-0" />
            <h2 className="text-xl font-bold tracking-tight">Fator 2 — Tamanho Amostral</h2>
          </div>
          <div className="border border-border rounded-sm p-4 bg-card space-y-2">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Fórmula</p>
            <code className="block text-sm font-mono text-primary bg-primary/10 p-2 rounded-sm">
              Wa = √n / 1.000
            </code>
            <p className="text-xs text-muted-foreground">onde <code className="text-primary">n</code> = número de entrevistados</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O erro padrão de uma proporção é <code className="text-foreground text-xs">σ = √(p(1−p)/n)</code>.
            Para p = 0,5 (pior caso), o erro padrão cai proporcionalmente a <code className="text-foreground text-xs">1/√n</code>.
            Portanto, o ganho real de precisão ao aumentar a amostra segue a raiz quadrada, não n diretamente.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Uma pesquisa com 1.000 entrevistados recebe <code className="text-foreground text-xs">Wa = √1000/1000 ≈ 0,032</code>.
            Uma com 4.000 entrevistados recebe <code className="text-foreground text-xs">Wa = √4000/1000 ≈ 0,063</code> — o dobro,
            não o quádruplo. Isso evita que pesquisas com amostras gigantes dominem
            a média e desvalorizem pesquisas menores mas metodologicamente sólidas.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-sm overflow-hidden text-xs font-mono text-center">
            {[
              { n: "500", wa: "0,022", me: "±4,5pp" },
              { n: "1.000", wa: "0,032", me: "±3,1pp" },
              { n: "2.000", wa: "0,045", me: "±2,2pp" },
              { n: "5.000", wa: "0,071", me: "±1,4pp" },
            ].map((r) => (
              <div key={r.n} className="bg-card px-3 py-3 space-y-1">
                <p className="font-bold text-foreground">n = {r.n}</p>
                <p className="text-primary">Wa = {r.wa}</p>
                <p className="text-muted-foreground">{r.me}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fator 3: Metodologia */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-primary shrink-0" />
            <h2 className="text-xl font-bold tracking-tight">Fator 3 — Metodologia de Coleta</h2>
          </div>
          <div className="border border-border rounded-sm p-4 bg-card space-y-2">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Escala de pesos</p>
            <div className="space-y-1 text-sm font-mono">
              {[
                { m: "Presencial (face-a-face)", w: "1,00", note: "Cobertura mais completa do eleitorado" },
                { m: "Telefônica (CATI / RDD)", w: "0,80", note: "Viés de sub-representação de jovens" },
                { m: "Mista (presencial + online)", w: "0,70", note: "Combinação com vieses parciais" },
                { m: "Online (painel / app)", w: "0,60", note: "Sub-representa idosos e baixa renda" },
              ].map((r) => (
                <div key={r.m} className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
                  <code className="text-primary shrink-0">Wm={r.w}</code>
                  <div>
                    <p className="text-foreground text-xs">{r.m}</p>
                    <p className="text-muted-foreground text-xs">{r.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A justificativa para hierarquizar metodologias vem de evidências empíricas brasileiras.
            Em 2022, pesquisas presenciais tiveram, em média, erro absoluto 0,8 pp menor que
            pesquisas online para o mesmo estado, controlando por instituto. O eleitorado brasileiro
            tem penetração digital desigual — enquanto 94% dos eleitores entre 20 e 35 anos têm
            smartphone, apenas 68% dos eleitores acima de 60 anos têm acesso à internet.
            Como idosos têm maior propensão ao voto, sub-representá-los distorce as projeções.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pesquisas telefônicas sub-representam jovens (menos propensão a atender chamadas
            desconhecidas) e populações de áreas rurais (cobertura de operadoras). Pesquisas mistas
            herdam vieses parciais de ambas as metodologias.
          </p>
        </section>

        {/* Fator 4: Acurácia */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            <h2 className="text-xl font-bold tracking-tight">Fator 4 — Acurácia Histórica do Instituto</h2>
          </div>
          <div className="border border-border rounded-sm p-4 bg-card space-y-2">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Cálculo do score</p>
            <code className="block text-sm font-mono text-primary bg-primary/10 p-2 rounded-sm leading-relaxed">
              MAE = média(|projeção_final − resultado_TSE|){"\n"}
              score = max(0, 1 − MAE / 5)
            </code>
            <p className="text-xs text-muted-foreground">MAE calculado sobre eleições 2018 e 2022. Eleições mais recentes recebem peso 2× maior.</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O score de acurácia é calculado pela diferença entre a última projeção pré-eleitoral
            do instituto e o resultado oficial publicado pelo TSE, em pontos percentuais.
            Um instituto que errou em média 1 pp nas últimas eleições recebe score alto (≈0,80).
            Um que errou 4 pp recebe score baixo (≈0,20). Isso não é um julgamento de qualidade
            — é uma calibração baseada em histórico verificável.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Institutos sem histórico de comparação com resultado real (lançados após 2022 ou
            sem pesquisas para cargos majoritários nas últimas duas eleições) recebem
            score neutro <code className="text-foreground text-xs">Wi = 0,75</code>, equivalente a desempenho razoável.
            O score é recalculado após cada eleição com os novos resultados.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O ranking completo de institutos por score de acurácia está disponível em{" "}
            <Link href="/institutos" className="text-primary hover:underline">/institutos</Link> e
            em <Link href="/instituto-mais-acurado-eleicoes-brasil" className="text-primary hover:underline">
              /instituto-mais-acurado-eleicoes-brasil
            </Link>.
          </p>
        </section>

        {/* Combinação dos fatores */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <Calculator className="h-5 w-5 text-primary shrink-0" />
            <h2 className="text-xl font-bold tracking-tight">Combinando os Quatro Fatores</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Os quatro fatores são multiplicados para produzir o peso total de cada pesquisa.
            A multiplicação — em vez de soma — garante que uma pesquisa com qualquer fator
            próximo de zero tenha peso próximo de zero no total, independentemente dos outros fatores.
            Uma pesquisa de metodologia online (Wm=0,6) de um instituto com acurácia baixa (Wi=0,4)
            publicada há 30 dias (Wr=0,125) com amostra de 500 pessoas (Wa=0,022) terá
            peso total de apenas <code className="text-foreground text-xs">0,125 × 0,022 × 0,6 × 0,4 ≈ 0,00066</code> —
            uma influência mínima na média final.
          </p>

          <div className="border border-border rounded-sm p-5 bg-card space-y-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Exemplo numérico — 3 pesquisas hipotéticas</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border">
                    {["Pesquisa", "t (dias)", "n", "Método", "Score inst.", "W total", "Lula"].map((h) => (
                      <th key={h} className="text-left py-2 pr-3 text-muted-foreground uppercase tracking-wider font-medium text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Datafolha", "5", "2.000", "presencial", "0,92", "0,0133", "38%"],
                    ["Quaest", "12", "2.004", "telefônica", "0,85", "0,0055", "37%"],
                    ["AtlasIntel", "3", "1.800", "online", "0,78", "0,0068", "40%"],
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-border/40">
                      {row.map((cell, j) => (
                        <td key={j} className={`py-2 pr-3 ${j === 5 ? "text-primary font-bold" : ""}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Média ponderada de Lula = (38×0,0133 + 37×0,0055 + 40×0,0068) / (0,0133 + 0,0055 + 0,0068)
              = <strong className="text-foreground">38,4%</strong>
            </p>
          </div>
        </section>

        {/* Limitações */}
        <section className="space-y-5">
          <h2 className="text-xl font-bold tracking-tight">Limitações Conhecidas</h2>
          <div className="space-y-4">
            {[
              {
                title: "House effects não são corrigidos explicitamente",
                body: "Institutos podem ter viés sistemático para determinados candidatos — tendência consistente de super ou subestimar além da margem de erro. A metodologia atual não corrige house effects diretamente, embora o score de acurácia histórica penalize indiretamente institutos com maiores desvios. Uma correção explícita de house effects será avaliada para ciclos eleitorais futuros.",
              },
              {
                title: "Pesquisas para cargo diferente tratadas separadamente",
                body: "Pesquisas de 1º turno e 2º turno têm modelos separados. Não misturamos resultados de turnos diferentes na mesma média. Pesquisas estaduais (governador) são completamente independentes das presidenciais.",
              },
              {
                title: "Score de acurácia depende de histórico disponível",
                body: "Institutos criados após 2022 ou sem histórico de pesquisas para cargos majoritários recebem score neutro. Isso pode subestimar a qualidade de institutos novos com metodologia sólida ou superestimar institutos antigos que melhoraram.",
              },
              {
                title: "Pesquisas com n < 400 são incluídas com peso reduzido",
                body: "Não excluímos pesquisas pequenas automaticamente, mas o fator Wa reduz significativamente seu peso. Uma pesquisa com n=200 tem Wa=0,014, menos de metade do peso de uma com n=1.000. Para estados menores onde amostras grandes são raras, esse comportamento é intencional.",
              },
            ].map((item) => (
              <div key={item.title} className="border-l-2 border-primary/30 pl-4 space-y-1">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
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
        <section className="border-t border-border pt-10 space-y-4 text-center">
          <p className="text-sm text-muted-foreground">A metodologia é pública. Os dados, também.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/pesquisas-presidenciais-2026"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
            >
              Ver médias presidenciais <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/imprensa"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-border rounded-sm text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              Documentação da API
            </Link>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Dúvidas metodológicas:{" "}
            <a href="mailto:contato@electiolab.com" className="text-primary hover:underline">
              contato@electiolab.com
            </a>
          </p>
        </section>

        <section className="max-w-3xl mx-auto px-4 pb-4">
          <LeiaTabem current="/metodologia" />
        </section>

      </main>

      <footer className="border-t border-border py-6 px-4 mt-8">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <Link href="/" className="flex items-center gap-2 hover:text-foreground transition-colors">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="font-mono">ElectioLab</span>
          </Link>
          <div className="flex flex-wrap gap-4">
            {[
              { href: "/glossario-pesquisa-eleitoral", label: "Glossário" },
              { href: "/margem-de-erro-pesquisa-eleitoral", label: "Margem de erro" },
              { href: "/instituto-mais-acurado-eleicoes-brasil", label: "Institutos" },
              { href: "/sobre", label: "Sobre" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
