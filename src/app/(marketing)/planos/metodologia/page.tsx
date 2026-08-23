import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, FileText, ScanText, Tags, UserCheck, ClipboardList } from "lucide-react";

export const metadata: Metadata = {
  title: {
    absolute: "Método — Planos de governo dos presidenciáveis 2026 | ElectioLab",
  },
  description:
    "De onde vêm os dados dos planos de governo, como o texto é extraído, como o recorte por tema é decidido e por que tudo passa por revisão humana antes de publicar.",
  alternates: { canonical: "https://electiolab.com/planos/metodologia" },
  openGraph: {
    title: "Método — Planos de governo dos presidenciáveis 2026",
    description: "Fonte, extração, classificação e revisão — como a seção Planos de governo é montada.",
    url: "https://electiolab.com/planos/metodologia",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

const FAQ = [
  {
    q: "De onde vem o texto dos planos de governo?",
    a: "Do PDF de 'Proposta de Governo' que cada candidato anexa obrigatoriamente ao registro de candidatura no TSE, publicado no DivulgaCandContas. Baixamos o PDF oficial, calculamos o hash SHA-256 e guardamos a data do download — nada é digitado ou reescrito por nós.",
  },
  {
    q: "Como o texto é extraído do PDF?",
    a: "Página por página, direto do PDF (texto nativo). Quando uma página é imagem escaneada e não tem texto nativo extraível, usamos OCR (reconhecimento ótico) como alternativa — essas páginas ficam marcadas internamente como OCR, porque o texto reconhecido por máquina pode ter erro de leitura.",
  },
  {
    q: "Como um trecho é associado a um tema?",
    a: "Em duas etapas. Primeiro um filtro por palavra-chave decide quais temas são candidatos pra cada parágrafo. Depois, só pros temas candidatos, um modelo de linguagem (LLM) decide se o parágrafo trata explicitamente daquele tema, usando a definição de escopo do tema como critério. As duas etapas juntas não são perfeitas — por isso a revisão humana obrigatória antes de publicar.",
  },
  {
    q: "Por que às vezes um candidato aparece sem nenhum trecho num tema?",
    a: "Porque o plano dele não trata explicitamente daquele tema — isso é mostrado como dado ('O plano não trata deste tema'), não omitido. Não inventamos posição que o candidato não escreveu.",
  },
  {
    q: "A ordem dos candidatos significa alguma coisa?",
    a: "Não. É sempre alfabética, nunca por posição em pesquisa, tamanho de partido ou qualquer critério de relevância.",
  },
  {
    q: "Isso é o que o candidato prometeu ou o que ele fez?",
    a: "É só promessa. Plano de governo é um documento de campanha, sem força de execução — não houve votação, aprovação ou qualquer verificação de cumprimento. Não deve ser confundido com atuação em mandatos anteriores.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://electiolab.com/planos/metodologia#article",
      headline: "Método — Planos de governo dos presidenciáveis 2026",
      description:
        "De onde vêm os dados, como o texto é extraído, como o recorte por tema é decidido e por que tudo passa por revisão humana antes de publicar.",
      url: "https://electiolab.com/planos/metodologia",
      author: { "@id": "https://electiolab.com/sobre#founder" },
      publisher: { "@id": "https://electiolab.com/#organization" },
      datePublished: "2026-08-23",
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
        { "@type": "ListItem", position: 2, name: "Planos de governo", item: "https://electiolab.com/planos" },
        { "@type": "ListItem", position: 3, name: "Método" },
      ],
    },
  ],
};

const PIPELINE = [
  {
    icon: FileText,
    titulo: "1. Ingestão",
    corpo:
      "PDF oficial de 'Proposta de Governo' baixado do DivulgaCandContas (TSE), um por candidato. Hash SHA-256 calculado no momento do download — reexecutar a ingestão não baixa de novo se o hash já bate, e qualquer alteração no documento original muda o hash.",
  },
  {
    icon: ScanText,
    titulo: "2. Extração de texto",
    corpo:
      "Texto nativo do PDF, página por página. Página sem texto nativo extraível (imagem escaneada) passa por OCR como alternativa — marcada internamente como tal, porque reconhecimento de imagem pode errar.",
  },
  {
    icon: Tags,
    titulo: "3. Recorte por tema",
    corpo:
      "Parágrafo completo (nunca frase cortada no meio) passa por um filtro de palavra-chave e depois por um modelo de linguagem, que decide se o parágrafo trata explicitamente do tema. Todo trecho nasce com status pendente.",
  },
  {
    icon: UserCheck,
    titulo: "4. Revisão humana",
    corpo:
      "Nenhum trecho pendente aparece nesta seção do site. Uma pessoa aprova, rejeita ou corrige o recorte antes de qualquer publicação — quem revisou e quando fica registrado.",
  },
  {
    icon: ClipboardList,
    titulo: "5. Publicação",
    corpo:
      "Só trecho aprovado aparece, agrupado por tema, com bloco por candidato em ordem alfabética — trecho literal, número da página e link pro PDF original.",
  },
];

export default function PlanosMetodologiaPage() {
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="sticky top-0 z-30 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/planos" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>Planos de governo</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-16 px-4 py-12">
        {/* Hero */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Documentação técnica</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">Método</h1>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Planos de governo dos presidenciáveis 2026
          </p>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            Esta página explica de onde vêm os dados, como o texto sai do PDF, como um trecho é associado a um
            tema e por que nada é publicado sem revisão humana antes.
          </p>
        </section>

        {/* Pipeline */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Como um trecho chega a esta página</h2>
          <div className="space-y-5">
            {PIPELINE.map((p) => (
              <div key={p.titulo} className="flex items-start gap-3">
                <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">{p.titulo}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.corpo}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Regra de recorte */}
        <section className="space-y-5">
          <h2 className="text-xl font-bold tracking-tight">Regra de recorte</h2>
          <div className="space-y-4">
            <div className="space-y-1 border-l-2 border-primary/30 pl-4">
              <h3 className="text-sm font-semibold">Unidade é o parágrafo completo</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Nunca cortamos frase no meio. Se o parágrafo menciona o tema só de passagem — um item numa lista
                de intenções, por exemplo — ainda conta como pertencente ao tema, sem marcação especial.
              </p>
            </div>
            <div className="space-y-1 border-l-2 border-primary/30 pl-4">
              <h3 className="text-sm font-semibold">Um trecho pode valer pra mais de um tema</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Só se tratar explicitamente de ambos — a classificação não força um parágrafo a caber numa única
                categoria quando ele genuinamente aborda dois temas ao mesmo tempo.
              </p>
            </div>
            <div className="space-y-1 border-l-2 border-primary/30 pl-4">
              <h3 className="text-sm font-semibold">Sem comparação, nota ou ranking</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Cada bloco de candidato mostra só o trecho literal do próprio plano — nenhum texto nosso liga um
                candidato a outro, nem qualifica quem propõe mais ou melhor.
              </p>
            </div>
            <div className="space-y-1 border-l-2 border-primary/30 pl-4">
              <h3 className="text-sm font-semibold">&ldquo;Não trata do tema&rdquo; é dado, não omissão</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Candidato sem trecho aprovado num tema aparece mesmo assim, com essa mensagem explícita — em vez
                de simplesmente sumir da página.
              </p>
            </div>
          </div>
        </section>

        {/* Limitações */}
        <section className="space-y-5">
          <h2 className="text-xl font-bold tracking-tight">Limitações conhecidas</h2>
          <div className="space-y-4">
            {[
              {
                title: "A classificação automática não é perfeita",
                body: "Palavra-chave e modelo de linguagem cometem erro — tanto classificando um trecho num tema que só tangencia, quanto deixando de propor um trecho relevante pra revisão. É exatamente por isso que nenhum trecho vai ao ar sem aprovação humana explícita antes.",
              },
              {
                title: "OCR pode errar em página escaneada",
                body: "Quando um PDF traz página como imagem em vez de texto, o reconhecimento automático (OCR) pode falhar em ler corretamente — principalmente em elementos gráficos, tabelas ou páginas de baixa resolução. Texto de origem OCR passa pela mesma revisão humana antes de publicar.",
              },
              {
                title: "Cobertura de tema depende de como o candidato escreveu",
                body: "Um plano pode tratar de um assunto sem usar os termos que o filtro de palavra-chave reconhece — isso pode significar que um trecho relevante nunca chega a ser proposto pra revisão. Estamos cientes dessa limitação e revisando a taxonomia de temas periodicamente.",
              },
              {
                title: "Plano de governo é promessa, não execução",
                body: "Nada nesta seção reflete o que o candidato de fato fez em mandatos anteriores, nem tem qualquer garantia de cumprimento — é o texto que a própria campanha registrou como proposta.",
              },
            ].map((item) => (
              <div key={item.title} className="space-y-1 border-l-2 border-warning/40 pl-4">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Perguntas frequentes</h2>
          <div className="space-y-5">
            {FAQ.map((item) => (
              <div key={item.q} className="space-y-1">
                <h3 className="text-sm font-semibold">{item.q}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="space-y-4 border-t border-border pt-10 text-center">
          <p className="text-sm text-muted-foreground">Os dados são públicos. O método, também.</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/planos"
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ver planos de governo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
