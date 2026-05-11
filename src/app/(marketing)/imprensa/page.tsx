import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, Download, Mail, ExternalLink, TrendingUp, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Imprensa — Press Kit e Dados para Jornalistas | ElectioLab" },
  description:
    "Dados atualizados, média agregada exportável, press release e contato de imprensa do ElectioLab — o agregador científico de pesquisas eleitorais do Brasil.",
  alternates: { canonical: "https://electiolab.com/imprensa" },
  openGraph: {
    title: "Imprensa — ElectioLab",
    description:
      "Dados, gráfico exportável, press release e contato para jornalistas que cobrem eleições 2026.",
    url: "https://electiolab.com/imprensa",
  },
};

const PRESS_EMAIL = "imprensa@electiolab.com";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "ElectioLab",
      url: "https://electiolab.com",
      logo: "https://electiolab.com/opengraph-image",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "press",
        email: PRESS_EMAIL,
        areaServed: "BR",
        availableLanguage: ["pt-BR"],
      },
      sameAs: ["https://github.com/luizlessa-dev/electiolab"],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: "https://electiolab.com/" },
        { "@type": "ListItem", position: 2, name: "Imprensa", item: "https://electiolab.com/imprensa" },
      ],
    },
  ],
};

export default function ImprensaPage() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Header */}
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

        {/* Hero */}
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Imprensa</p>
          <h1 className="text-3xl font-bold tracking-tight">Press Kit — ElectioLab</h1>
          <p className="text-muted-foreground max-w-2xl">
            O ElectioLab é o primeiro agregador científico de pesquisas eleitorais do Brasil.
            Aqui você encontra press releases, números atualizados, metodologia e contato de imprensa.
          </p>
          <a
            href={`mailto:${PRESS_EMAIL}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            {PRESS_EMAIL}
          </a>
        </div>

        {/* Números para press */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Dados de cobertura</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-sm overflow-hidden">
            {[
              { value: "26+", label: "Pesquisas 2026", sub: "indexadas" },
              { value: "13",  label: "Institutos",     sub: "monitorados" },
              { value: "60k+", label: "Entrevistados", sub: "total acumulado" },
              { value: "27",  label: "Estados",        sub: "eleições para governador" },
            ].map((s) => (
              <div key={s.label} className="bg-card px-5 py-4 text-center space-y-1">
                <p className="text-2xl font-mono font-bold tabular-nums text-foreground">{s.value}</p>
                <p className="text-xs font-semibold text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Snapshot da média — gráfico para jornalistas */}
        <section className="space-y-4" id="dados">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Snapshot da média agregada
            </h2>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <Calendar className="h-3 w-3" /> Semana 17 · Abr/2026
              </span>
            </div>
          </div>

          {/* Presidencial */}
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-foreground">PRESIDENCIAL 2026 — 1º turno</span>
              <span className="text-xs font-mono text-muted-foreground">Média ponderada ElectioLab</span>
            </div>
            <div className="divide-y divide-border">
              {[
                { name: "Lula",      party: "PT",           pct: 36.8, color: "#ef4444" },
                { name: "Bolsonaro", party: "PL",           pct: 30.4, color: "#3b82f6" },
                { name: "Tarcísio",  party: "Republicanos", pct: 18.2, color: "#8b5cf6" },
                { name: "Outros",    party: "—",            pct: 14.6, color: "#6b7280" },
              ].map((c, i) => (
                <div key={c.name} className="px-4 py-3 flex items-center gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.party}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-40 hidden sm:block">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(c.pct / 42) * 100}%`, backgroundColor: c.color }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">26 pesquisas · 13 institutos · 60.608 entrevistados</span>
              <Link href="/pesquisas-presidenciais-2026" className="text-xs text-primary hover:underline font-mono">
                Ver página completa →
              </Link>
            </div>
          </div>

          {/* Governadores destaque */}
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <span className="text-xs font-mono font-semibold text-foreground">GOVERNADORES — LÍDERES POR ESTADO</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-px bg-border">
              {[
                { uf: "SP", nome: "Tarcísio",      pct: "40,0%", partido: "Rep", href: "/eleicoes-governador-sp-2026" },
                { uf: "MG", nome: "Cleitinho",     pct: "48,0%", partido: "Rep", href: "/eleicoes-governador-mg-2026" },
                { uf: "RJ", nome: "Eduardo Paes",  pct: "49,0%", partido: "PSD", href: "/eleicoes-governador-rj-2026" },
                { uf: "RS", nome: "Luciano Zucco", pct: "24,0%", partido: "PL", href: "/eleicoes-governador-rs-2026" },
                { uf: "BA", nome: "ACM Neto",      pct: "41,0%", partido: "UB", href: "/eleicoes-governador-ba-2026" },
                { uf: "PE", nome: "João Campos",   pct: "46,0%", partido: "PSB", href: "/eleicoes-governador-pe-2026" },
              ].map((s) => (
                <Link key={s.uf} href={s.href}
                  className="bg-card px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-primary w-6">{s.uf}</span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{s.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{s.partido}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold tabular-nums text-foreground">{s.pct}</span>
                </Link>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-border bg-muted/20">
              <Link href="/" className="text-xs text-primary hover:underline font-mono">
                Ver todos os 27 estados →
              </Link>
            </div>
          </div>

          {/* Export / download */}
          <div className="border border-border rounded-sm bg-card px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">Exportar dados para matéria</p>
              <p className="text-xs text-muted-foreground">Dados brutos em JSON ou CSV via API pública. Sem autenticação.</p>
            </div>
            <div className="flex items-center gap-2">
              <a href="/api/v1/polls?format=csv"
                 className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                <Download className="h-3 w-3" /> CSV
              </a>
              <a href="/api/v1/polls"
                 className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                <ExternalLink className="h-3 w-3" /> JSON
              </a>
              <Link href="/relatorio/semana-17-2026"
                 className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-sm text-xs font-mono text-primary hover:bg-primary/20 transition-colors">
                <TrendingUp className="h-3 w-3" /> Relatório semanal
              </Link>
            </div>
          </div>
        </section>

        {/* Sobre o projeto */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sobre o projeto</h2>
          <div className="prose prose-sm prose-invert max-w-none space-y-4 text-muted-foreground leading-relaxed">
            <p>
              O <strong className="text-foreground">ElectioLab</strong> nasceu de uma constatação simples: pesquisas
              eleitorais isoladas são ruído. Um instituto aponta 39%, outro diz 33% para o mesmo candidato na mesma
              semana. Qual está certo? A imprensa amplifica o dado mais polêmico, não o mais preciso.
            </p>
            <p>
              A solução vem da ciência política americana — o <em>polling aggregation</em> popularizado pelo
              FiveThirtyEight de Nate Silver. O ElectioLab traz esse método para o Brasil, adaptado para a realidade
              local: institutos com histórico distinto, metodologias mistas e o ciclo eleitoral de dois turnos.
            </p>
            <p>
              A fórmula pondera cada pesquisa por quatro fatores: <strong className="text-foreground">recência</strong> (meia-vida de
              10 dias), <strong className="text-foreground">tamanho da amostra</strong> (√n), <strong className="text-foreground">metodologia</strong> (presencial &gt; telefônica &gt; online) e
              <strong className="text-foreground"> histórico de acurácia do instituto</strong> (score baseado no Erro Médio Absoluto em
              eleições anteriores). O resultado é uma estimativa mais estável e mais próxima da realidade do que
              qualquer pesquisa individual.
            </p>
            <p>
              Todos os dados são públicos e derivados de pesquisas registradas no TSE.
              A metodologia é <strong className="text-foreground">totalmente transparente e auditável</strong>.
            </p>
          </div>
        </section>

        {/* Press release */}
        <section className="space-y-4" id="press-release">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Press Release</h2>
            <span className="text-xs font-mono text-muted-foreground">23 de abril de 2026</span>
          </div>

          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-6 py-5 border-b border-border bg-primary/5">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2">PARA PUBLICAÇÃO IMEDIATA</p>
              <h3 className="text-lg font-bold leading-tight">
                Brasil ganha seu primeiro agregador científico de pesquisas eleitorais: o ElectioLab
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Plataforma consolida pesquisas de Quaest, Datafolha, Atlas Intel e outros em uma única
                média ponderada — metodologia similar ao FiveThirtyEight americano
              </p>
            </div>

            <div className="px-6 py-5 space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">SÃO PAULO, 23 de abril de 2026</strong> — Com as eleições
                presidenciais de 2026 se aproximando, o Brasil estreia uma ferramenta inédita para o acompanhamento
                científico da corrida eleitoral: o <strong className="text-foreground">ElectioLab</strong>
                (electiolab.com), plataforma que agrega todas as pesquisas de intenção de voto publicadas e calcula
                uma média ponderada baseada em critérios de qualidade estatística.
              </p>

              <p>
                A iniciativa responde a um problema bem documentado no jornalismo político brasileiro: a cobertura
                de pesquisas isoladas cria a ilusão de volatilidade que não existe na realidade eleitoral. "Um
                instituto diz 39%, outro diz 33% na mesma semana. A manchete fica com o outlier. O ElectioLab
                mostra que, na média ponderada, o número está em 37% — e que a tendência é estável há três semanas",
                explica o projeto.
              </p>

              <p>
                A metodologia de ponderação considera quatro fatores: <strong className="text-foreground">recência</strong> da
                pesquisa (pesquisas mais antigas decaem com meia-vida de 10 dias), <strong className="text-foreground">tamanho da
                amostra</strong> (amostras maiores pesam mais, com retorno decrescente via √n),
                <strong className="text-foreground"> metodologia de coleta</strong> (presencial supera telefônica, que supera
                online) e <strong className="text-foreground">histórico de acurácia do instituto</strong> (institutos com menor
                Erro Médio Absoluto em eleições passadas têm peso maior).
              </p>

              <p>
                O banco de dados atual cobre as eleições presidenciais de 2022 (1º e 2º turnos) e 2026 (1º turno
                em andamento), além das corridas para governador de SP, MG e RJ — com mais de 25 pesquisas,
                13 institutos monitorados e mais de 120.000 entrevistados consolidados. A plataforma é gratuita
                e de acesso aberto.
              </p>

              <div className="border-l-2 border-primary pl-4 py-1 my-4">
                <p className="text-foreground font-medium italic">
                  "No Brasil, a ausência de um agregador fazia com que cada pesquisa fosse tratada como a verdade
                  absoluta. A agregação não elimina a incerteza — ela a quantifica corretamente."
                </p>
                <p className="text-xs text-muted-foreground mt-1">— ElectioLab</p>
              </div>

              <p>
                Além da média ponderada, a plataforma oferece análise de tendência temporal, ranking de acurácia
                dos institutos, base de dados explorável com filtros e API pública para pesquisadores e
                desenvolvedores.
              </p>

              <div className="pt-2 border-t border-border text-xs space-y-1">
                <p><strong className="text-foreground">Contato de imprensa:</strong> {PRESS_EMAIL}</p>
                <p><strong className="text-foreground">Dashboard:</strong> electiolab.com/dashboard</p>
                <p><strong className="text-foreground">Metodologia completa:</strong> electiolab.com/sobre</p>
                <p><strong className="text-foreground">API pública:</strong> electiolab.com/api/v1/polls</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pitches por publicação */}
        <section className="space-y-4" id="pitches">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Sugestões de pauta por veículo
            </h2>
            <span className="text-xs font-mono text-muted-foreground">10 veículos</span>
          </div>
          <div className="space-y-3">
            {[
              {
                pub: "Poder360",
                perfil: "Jornalismo político, alto tráfego, leitores de assessoria e campanha",
                angulo: "\"O FiveThirtyEight brasileiro: nova plataforma consolida pesquisas eleitorais em média científica\"",
                destaque: "Ranking de acurácia de institutos — quem erra mais nas previsões eleitorais brasileiras",
                contato: "redacao@poder360.com.br",
              },
              {
                pub: "Nexo Jornal",
                perfil: "Data journalism, público acadêmico e formador de opinião",
                angulo: "\"Como uma média de pesquisas é mais confiável do que qualquer pesquisa individual\"",
                destaque: "Infográfico comparativo: pesquisa isolada vs. média ElectioLab nas últimas 8 semanas",
                contato: "redacao@nexojornal.com.br",
              },
              {
                pub: "Folha de S.Paulo",
                perfil: "Maior jornal do Brasil, cobertura eleitoral com equipe dedicada desde 2021",
                angulo: "\"Pesquisa mostra X%, outra diz Y% — por que os números divergem e o que a média revela\"",
                destaque: "Tabela comparativa de pesquisas da semana vs. média ElectioLab para colunistas de política",
                contato: "redacao@grupofolha.com.br",
              },
              {
                pub: "Estadão / Agência Estado",
                perfil: "Wire service com maior alcance no Brasil — sindicado para 2.000+ veículos regionais",
                angulo: "\"ElectioLab: a plataforma que trata pesquisas eleitorais com método estatístico\"",
                destaque: "Dado de acurácia: instituto que mais acertou nas eleições de 2022 segundo o ElectioLab",
                contato: "editorias@estadao.com.br",
              },
              {
                pub: "G1 / Globonews Política",
                perfil: "Maior audiência digital do Brasil — cada publicação sobre eleições gera centenas de comentários",
                angulo: "\"Como funciona o novo site que calcula a média de todas as pesquisas eleitorais do Brasil\"",
                destaque: "Explicação didática da metodologia + demonstração ao vivo no dashboard para colunistas",
                contato: "g1@g1.globo.com",
              },
              {
                pub: "Piauí",
                perfil: "Long-form, credibilidade máxima, influência em formadores de opinião",
                angulo: "\"A matemática das eleições: como agregar pesquisas muda a leitura da corrida presidencial\"",
                destaque: "Perfil da metodologia + análise do efeito da cobertura de outliers na imprensa BR",
                contato: "redacao@revistapiaui.com.br",
              },
              {
                pub: "BBC Brasil",
                perfil: "Credibilidade internacional, audiência de classe média alta, fact-checking rigoroso",
                angulo: "\"Eleições 2026: como o Brasil passou a ter seu próprio agregador de pesquisas\"",
                destaque: "Comparação com FiveThirtyEight e Politico Polling Average — diferenças para o contexto BR",
                contato: "brasil@bbc.co.uk",
              },
              {
                pub: "CartaCapital",
                perfil: "Análise política progressista, público de intelectuais e militantes",
                angulo: "\"Pesquisas eleitorais: como a agregação científica desafia a cobertura sensacionalista\"",
                destaque: "Análise: quanto a cobertura de outliers distorce a percepção da corrida presidencial",
                contato: "redacao@cartacapital.com.br",
              },
              {
                pub: "Agência Pública",
                perfil: "Jornalismo investigativo, open data, credibilidade em transparência",
                angulo: "\"Dados do TSE sobre pesquisas eleitorais: quem registrou mais e quem mais errou?\"",
                destaque: "Uso da API pública + análise de transparência dos institutos com dados ElectioLab",
                contato: "contato@agenciapublica.org.br",
              },
              {
                pub: "The Intercept Brasil",
                perfil: "Política, dados, público engajado e crítico",
                angulo: "\"Por que a imprensa distorce pesquisas eleitorais — e como corrigir isso\"",
                destaque: "Análise de quantas matérias usaram outliers como título vs. tendência real no mesmo período",
                contato: "redacao@theintercept.com.br",
              },
            ].map((item) => (
              <div key={item.pub} className="border border-border rounded-sm bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{item.pub}</h3>
                  <a href={`mailto:${item.contato}?subject=Pauta: ElectioLab — agregador de pesquisas eleitorais&body=Olá, equipe do ${item.pub},%0A%0AEstou entrando em contato para apresentar o ElectioLab (electiolab.com), o primeiro agregador científico de pesquisas eleitorais do Brasil.%0A%0AA sugestão de pauta é: ${item.angulo}%0A%0APara mais informações: imprensa@electiolab.com%0A%0AAt,%0AElectioLab`}
                     className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Mail className="h-3 w-3" /> Enviar pitch
                  </a>
                </div>
                <div className="px-4 py-3 space-y-2 text-xs text-muted-foreground">
                  <p><span className="text-foreground font-medium">Perfil:</span> {item.perfil}</p>
                  <p><span className="text-foreground font-medium">Ângulo:</span> {item.angulo}</p>
                  <p><span className="text-foreground font-medium">Destaque exclusivo:</span> {item.destaque}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Links rápidos */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Links úteis para jornalistas</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { label: "Dashboard ao vivo", href: "/dashboard", desc: "Média ponderada atualizada a cada 6h" },
              { label: "Todos os candidatos", href: "/candidatos", desc: "300+ perfis filtráveis (UF, partido, cargo)" },
              { label: "Comparar candidatos", href: "/comparar", desc: "Comparativo lado a lado, URL compartilhável" },
              { label: "Institutos & acurácia", href: "/institutos", desc: "Ranking Datafolha/Quaest/Ipec por desvio histórico" },
              { label: "Metodologia completa", href: "/sobre", desc: "Fórmula, pesos e critérios" },
              { label: "API pública (JSON)", href: "/api/v1/polls", desc: "Dados brutos para análise" },
              { label: "Export CSV", href: "/api/v1/polls?format=csv", desc: "Download direto em planilha" },
              { label: "llms.txt", href: "/llms.txt", desc: "Contexto para ferramentas de AI" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-start gap-3 px-4 py-3 border border-border rounded-sm hover:border-primary/30 transition-colors group"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{l.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            ElectioLab — Terminal de Inteligência Eleitoral
          </span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <Link href="/sobre" className="hover:text-foreground transition-colors">Metodologia</Link>
            <span>·</span>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
