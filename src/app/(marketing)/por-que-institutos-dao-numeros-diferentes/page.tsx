import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3, ArrowRight, AlertTriangle, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: {
    absolute: "Por que Datafolha e AtlasIntel dão números tão diferentes? | ElectioLab",
  },
  description:
    "Entenda por que institutos de pesquisa eleitoral divergem tanto: house effects, metodologia de coleta, ponderação demográfica e viés sistemático. Como o ElectioLab lida com essas diferenças.",
  alternates: {
    canonical: "https://electiolab.com/por-que-institutos-dao-numeros-diferentes",
  },
  openGraph: {
    title: "Por que Datafolha e AtlasIntel dão números tão diferentes?",
    description:
      "House effects, metodologia e viés sistemático: por que institutos chegam a resultados opostos na mesma semana — e como ler essas diferenças.",
    url: "https://electiolab.com/por-que-institutos-dao-numeros-diferentes",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const FAQ = [
  {
    q: "O que são 'house effects' em pesquisa eleitoral?",
    a: "House effects (viés de casa) são desvios sistemáticos e consistentes de um instituto específico em relação ao resultado real ou à média dos demais institutos. Diferente do erro aleatório (variação amostral), o house effect é previsível: o instituto X sistematicamente superstima o candidato A e subestima o B, mesmo usando metodologia tecnicamente correta.",
  },
  {
    q: "Por que pesquisas do Datafolha e AtlasIntel chegam a números tão diferentes?",
    a: "As principais razões são: (1) Metodologia de coleta — Datafolha usa pesquisa presencial com cotas geográficas rigorosas; AtlasIntel usa painel online. O eleitorado de baixa renda e o eleitorado rural, que tendem ao voto mais conservador, são sistematicamente sub-representados em pesquisas online. (2) Ponderação demográfica — cada instituto usa critérios diferentes para calibrar a amostra por faixa etária, renda e escolaridade. (3) Período de campo — uma pesquisa feita às segundas e terças pode capturar humor diferente de uma feita às sextas e fins de semana.",
  },
  {
    q: "House effect significa que um instituto está errado?",
    a: "Não necessariamente. Um instituto pode ter house effect consistente e ainda assim medir algo real. Se o eleitorado online é sistematicamente mais liberal, o AtlasIntel não está 'errado' — está medindo esse subgrupo com precisão. O problema é quando o resultado é apresentado como representativo do eleitorado geral sem ajuste para a sub-representação estrutural.",
  },
  {
    q: "Como o ElectioLab lida com os house effects na média?",
    a: "O ElectioLab não corrige house effects explicitamente na versão atual da metodologia. Em vez disso, o fator de metodologia de coleta (Wm) penaliza pesquisas online em relação às presenciais, e o score de acurácia histórica penaliza indiretamente institutos com desvios sistemáticos maiores. Uma correção explícita de house effects está prevista para versões futuras.",
  },
  {
    q: "Como um jornalista deve contextualizar a diferença entre institutos?",
    a: "A regra prática: compare tendência, não número pontual. Se Datafolha dá 38% e AtlasIntel dá 43% para o mesmo candidato, não conclua que 'um está errado'. Verifique a tendência — os dois estão subindo, descendo ou estáveis? A direção importa mais do que o número absoluto. Para comparar institutos de forma justa, use a variação relativa ('subiu 2pp desde a última pesquisa do mesmo instituto') em vez de comparação direta entre institutos.",
  },
  {
    q: "Instituto com house effect pode acertar a eleição?",
    a: "Sim. House effect é um viés no pré-eleição, não necessariamente no número final. Muitos institutos com house effect consistente durante a campanha 'corrigem' naturalmente nas últimas pesquisas, quando o eleitorado se cristaliza e o voto útil elimina candidatos menores. Por isso a acurácia histórica no ElectioLab é calculada sobre a última pesquisa antes da eleição.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://electiolab.com/por-que-institutos-dao-numeros-diferentes#article",
      headline: "Por que Datafolha e AtlasIntel dão números tão diferentes?",
      description:
        "House effects, metodologia de coleta e viés sistemático em pesquisa eleitoral — e como o ElectioLab lida com essas diferenças.",
      url: "https://electiolab.com/por-que-institutos-dao-numeros-diferentes",
      mainEntityOfPage: "https://electiolab.com/por-que-institutos-dao-numeros-diferentes",
      author: { "@id": "https://electiolab.com/sobre#founder" },
      publisher: { "@id": "https://electiolab.com/#organization" },
      datePublished: "2026-05-27",
      dateModified: new Date().toISOString().slice(0, 10),
      inLanguage: "pt-BR",
      keywords: [
        "house effects pesquisa eleitoral",
        "viés instituto pesquisa",
        "por que pesquisas divergem",
        "Datafolha vs AtlasIntel",
        "metodologia pesquisa eleitoral",
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
        { "@type": "ListItem", position: 3, name: "House effects — por que institutos divergem" },
      ],
    },
  ],
};

const DIVERGENCE_REASONS = [
  {
    title: "Metodologia de coleta",
    tag: "Principal causa",
    tagColor: "text-destructive border-destructive/40 bg-destructive/10",
    body: "A forma como o instituto chega até o entrevistado muda quem responde à pesquisa. Presencial com cotas geográficas cobre favelas, zonas rurais e eleitores sem smartphone. Online cobre quem tem acesso à internet e está disposto a responder painéis — perfil sistematicamente mais jovem, urbano e escolarizado.",
    example: "Dois institutos que entrevistam o mesmo estado no mesmo dia podem chegar a resultados 4–6pp diferentes apenas pela metodologia.",
  },
  {
    title: "Ponderação demográfica",
    tag: "Efeito amplificador",
    tagColor: "text-amber-500 border-amber-500/40 bg-amber-500/10",
    body: "Depois de coletar, cada instituto pondera a amostra para refletir a distribuição real do eleitorado — por faixa etária, renda, escolaridade, região. O problema: o censo eleitoral não é atualizado em tempo real. Institutos diferentes usam tabelas de ponderação diferentes, produzindo resultados diferentes mesmo com amostras parecidas.",
    example: "Um instituto que usa a distribuição do Censo 2010 para ponderar por escolaridade produzirá resultado diferente de um que usa projeções 2026 do IBGE.",
  },
  {
    title: "Período e horário de campo",
    tag: "Efeito moderado",
    tagColor: "text-blue-500 border-blue-500/40 bg-blue-500/10",
    body: "Pesquisas coletadas em diferentes momentos do ciclo semanal podem capturar humores políticos distintos. Eventos de campanha, declarações polêmicas e cobertura midiática mudam a intenção de voto em dias. Uma pesquisa de campo que começa na segunda e termina na sexta 'mistura' momentos diferentes.",
    example: "Pesquisas de campo após debates tendem a mostrar variações maiores do que pesquisas em semanas politicamente neutras.",
  },
  {
    title: "Formulação da pergunta",
    tag: "Efeito técnico",
    tagColor: "text-violet-500 border-violet-500/40 bg-violet-500/10",
    body: "A ordem dos candidatos no cartão, a forma como indecisos são tratados ('em quem você votaria se a eleição fosse hoje?' vs. 'quem você prefere entre...') e a inclusão de candidatos menores afetam o resultado. Pesquisas com listas longas tendem a distribuir mais votos entre candidatos menores.",
    example: "Um candidato com 5% em pesquisa com lista de 8 nomes pode aparecer com 7% em pesquisa com lista de 4 nomes — o mesmo eleitor, respostas diferentes.",
  },
];

export default function PorQueInstitutosDaoNumerosDiferentesPage() {
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
            href="/pesquisas-presidenciais-2026"
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium"
          >
            Ver médias →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-14">

        {/* Hero */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <Link href="/glossario-pesquisa-eleitoral" className="hover:text-foreground transition-colors">
              Glossário de pesquisa eleitoral
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Por que Datafolha e AtlasIntel dão números tão diferentes?
          </h1>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            House Effects, Metodologia e Viés Sistemático
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            Na mesma semana, o Datafolha pode mostrar Lula com 36% e o AtlasIntel com 42%.
            Qual está certo? A resposta: os dois podem estar medindo coisas ligeiramente diferentes.
            Entender por que institutos divergem é fundamental para ler pesquisas eleitorais sem ser
            manipulado pela cobertura jornalística que destaca sempre o dado mais dramático.
          </p>
        </section>

        {/* O problema */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">O problema: pesquisas como foto, não filme</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cada pesquisa eleitoral é uma <em>estimativa estatística</em> com margem de erro —
            geralmente ±2 a ±3 pontos percentuais com 95% de confiança. Isso significa que, mesmo
            que o método seja perfeito, a pesquisa pode errar em até 3 pp por puro acaso amostral.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Quando dois institutos divergem em 6 pp, isso não é necessariamente contradição.
            Cada um pode estar dentro da sua margem de erro. O problema surge quando a divergência
            é <em>sistemática</em> — sempre no mesmo sentido, sempre favorecendo o mesmo candidato.
            Isso é o que chamamos de <strong className="text-foreground">house effect</strong>.
          </p>
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-sm p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Regra prática:</strong> Se um instituto
                sistematicamente dá 5pp a mais para o candidato A em relação a todos os outros
                institutos, durante meses, isso é um house effect — não uma medição mais precisa.
              </p>
            </div>
          </div>
        </section>

        {/* Quatro razões */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">4 razões pelas quais institutos divergem</h2>
          <div className="space-y-6">
            {DIVERGENCE_REASONS.map((item, i) => (
              <div key={item.title} className="border border-border rounded-sm p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold">
                    <span className="text-muted-foreground font-mono text-xs mr-2">{i + 1}.</span>
                    {item.title}
                  </h3>
                  <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm border shrink-0 ${item.tagColor}`}>
                    {item.tag}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                <div className="bg-muted/30 rounded-sm p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Exemplo:</strong> {item.example}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Datafolha vs AtlasIntel especificamente */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">Datafolha vs. AtlasIntel: o caso mais visível</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Em 2026, a divergência mais frequente nos noticiários é entre Datafolha e AtlasIntel.
            Os dois são referências de qualidade — mas com filosofias metodológicas opostas.
          </p>

          <div className="grid md:grid-cols-2 gap-px bg-border rounded-sm overflow-hidden">
            {[
              {
                name: "Datafolha",
                color: "text-blue-400",
                method: "Presencial com cotas",
                freq: "1–2× por mês",
                sample: "2.000–3.000 entrevistados",
                strength: "Cobertura do eleitorado rural e de baixa renda. Histórico de acurácia em eleições presidenciais.",
                weakness: "Mais caro, menos frequente. Tempo de campo de 3–4 dias pode perder movimentos rápidos.",
              },
              {
                name: "AtlasIntel",
                color: "text-orange-400",
                method: "Painel online RDD",
                freq: "Semanal ou mais",
                sample: "1.200–2.000 entrevistados",
                strength: "Alta frequência, resposta rápida a eventos de campanha. Cobriu bem tendências de longo prazo em 2022.",
                weakness: "Sub-representa eleitores sem acesso digital. Eleitores mais conservadores e rurais sub-representados.",
              },
            ].map((inst) => (
              <div key={inst.name} className="bg-card p-5 space-y-3">
                <h3 className={`text-base font-bold ${inst.color}`}>{inst.name}</h3>
                <div className="space-y-2 text-xs">
                  {[
                    ["Método", inst.method],
                    ["Frequência", inst.freq],
                    ["Amostra típica", inst.sample],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-muted-foreground shrink-0 w-24">{k}</span>
                      <span className="text-foreground font-mono">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="text-positive font-medium">↑ Ponto forte:</span> {inst.strength}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-destructive font-medium">↓ Limitação:</span> {inst.weakness}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            O eleitorado brasileiro tem estrutura socioeconômica que favorece o voto conservador
            nas camadas de menor acesso digital. Quando o AtlasIntel sub-representa esse grupo,
            a pesquisa tende a mostrar número diferente do Datafolha — não porque um está errado,
            mas porque estão medindo populações ligeiramente diferentes.
          </p>
        </section>

        {/* Como o ElectioLab lida */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">Como o ElectioLab lida com essas diferenças</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O ElectioLab não descarta nenhum instituto — em vez disso, pondera cada pesquisa
            por quatro fatores: recência, tamanho amostral, metodologia e acurácia histórica.
            O fator de metodologia (Wm) dá peso menor a pesquisas online em relação às presenciais,
            reduzindo parcialmente o efeito da sub-representação estrutural.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-sm overflow-hidden text-xs font-mono text-center">
            {[
              { label: "Presencial", w: "1,00", note: "Peso integral" },
              { label: "Telefônica", w: "0,80", note: "−20%" },
              { label: "Mista", w: "0,70", note: "−30%" },
              { label: "Online", w: "0,60", note: "−40%" },
            ].map((r) => (
              <div key={r.label} className="bg-card px-3 py-3 space-y-1">
                <p className="font-bold text-foreground">{r.label}</p>
                <p className="text-primary">Wm = {r.w}</p>
                <p className="text-muted-foreground">{r.note}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O resultado: a média ponderada do ElectioLab tende a ficar entre os extremos,
            dando mais peso à pesquisa presencial mais recente enquanto inclui os sinais
            de tendência das pesquisas online de alta frequência. Documentação técnica completa
            em{" "}
            <Link href="/metodologia" className="text-primary hover:underline">/metodologia</Link>.
          </p>
        </section>

        {/* Como ler pesquisas */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">Como ler pesquisas com house effects em mente</h2>
          <div className="space-y-3">
            {[
              {
                rule: "Compare tendência, não número absoluto",
                detail: "Se o AtlasIntel sistematicamente dá +4pp para o candidato A, o que importa é se esse número subiu ou caiu na última pesquisa — não o nível absoluto.",
              },
              {
                rule: "Compare o mesmo instituto consigo mesmo",
                detail: "A variação mais confiável é: 'Datafolha de hoje vs Datafolha de 2 semanas atrás'. Cruzar institutos diferentes requer ajuste que a maioria dos noticiários não faz.",
              },
              {
                rule: "Desconfie de pesquisas que aparecem só em notícias polêmicas",
                detail: "Quando uma pesquisa diverge muito de todas as outras, verifique: é a primeira pesquisa desse instituto? A amostra é incomum? Quem encomendou?",
              },
              {
                rule: "Use a média, não o dado mais recente",
                detail: "É exatamente o que o ElectioLab faz. A média ponderada de múltiplos institutos é mais estável e mais próxima do resultado real do que qualquer pesquisa individual.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 py-3 border-b border-border/40 last:border-0">
                <span className="text-xs font-mono text-primary font-bold shrink-0 pt-0.5">{i + 1}.</span>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">{item.rule}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.detail}</p>
                </div>
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

        {/* Links relacionados */}
        <section className="border-t border-border pt-8 space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Leia também</p>
          <div className="grid sm:grid-cols-2 gap-px bg-border rounded-sm overflow-hidden">
            {[
              {
                href: "/metodologia",
                title: "Metodologia ElectioLab",
                desc: "Como calculamos os pesos de cada pesquisa — fórmulas e parâmetros completos.",
              },
              {
                href: "/instituto-mais-acurado-eleicoes-brasil",
                title: "Instituto mais acurado",
                desc: "Ranking dos institutos por acurácia histórica vs resultado TSE em 2018 e 2022.",
              },
              {
                href: "/margem-de-erro-pesquisa-eleitoral",
                title: "Margem de erro",
                desc: "O que significa ±3pp e quando dois candidatos estão em empate técnico.",
              },
              {
                href: "/pesquisa-presencial-vs-online",
                title: "Presencial vs online",
                desc: "Como a metodologia de coleta muda o resultado e quais vieses cada uma carrega.",
              },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="bg-card px-4 py-4 hover:bg-muted/30 transition-colors group space-y-1"
              >
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {l.title} <ArrowRight className="h-3 w-3 inline" />
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{l.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4 pb-8">
          <p className="text-sm text-muted-foreground">
            A melhor forma de ler pesquisas é pela média ponderada de todas elas.
          </p>
          <Link
            href="/pesquisas-presidenciais-2026"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            Ver médias presidenciais 2026 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
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
              { href: "/metodologia", label: "Metodologia" },
              { href: "/pesquisas-presidenciais-2026", label: "Presidenciais 2026" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
