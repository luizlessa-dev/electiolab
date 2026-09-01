import { createClient } from "@supabase/supabase-js";

/**
 * `llms.txt` gerado a partir do banco.
 *
 * Era um arquivo estático em `public/`. Em 17/08/2026 a auditoria achou nele um
 * erro factual sobre quem disputa a Presidência (listava Jair Bolsonaro como
 * candidato do PL; o candidato é Flávio) mais estatísticas defasadas em ordem
 * de grandeza — "30+ pesquisas" contra 185 reais, "70.000+ entrevistados"
 * contra 369 mil. Num arquivo cuja função é servir de fonte de verdade para
 * modelos de linguagem, isso é o pior tipo de erro possível.
 *
 * Escrever de novo à mão resolveria até a próxima defasagem. Gerar do banco
 * resolve a classe do problema: as seções voláteis — campo presidencial,
 * estatísticas, data da última pesquisa — passam a refletir o que o produto
 * de fato tem. Ver docs/ELECTIOLAB-AUDIT-2026-08.md, achado C6.
 *
 * As seções estáveis (páginas, metodologia, cluster editorial) seguem em
 * texto, porque não rotam.
 */

export const revalidate = 21600; // 6h — mesma cadência do recálculo das médias

const SITE = "https://electiolab.com";

const UFS = [
  "SP", "MG", "RJ", "RS", "BA", "PR", "PE", "CE", "GO", "PA", "SC", "MA",
  "AM", "PB", "ES", "RN", "PI", "MT", "DF", "AL", "MS", "SE", "TO", "RO",
  "AC", "AP", "RR",
];

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type Presidencial = {
  nome: string;
  partido: string | null;
  slug: string;
  pesquisas: number;
  media: number;
  ultima: string;
};

/**
 * Campo presidencial real: quem aparece em pesquisa curada, não quem alguém
 * digitou numa lista. Ordena por número de pesquisas — presença sustentada
 * na corrida — e carrega a data da última aparição, para que um modelo que
 * leia o arquivo saiba a idade do dado em vez de assumir que é de hoje.
 */
async function campoPresidencial(): Promise<Presidencial[]> {
  try {
    const { data: eleicao } = await sb()
      .from("elections")
      .select("id")
      .eq("year", 2026)
      .eq("type", "presidente")
      .eq("round", 1)
      .maybeSingle();
    if (!eleicao) return [];

    const { data } = await sb()
      .from("poll_results")
      .select(
        "percentage, candidate:candidates(name, party, slug), poll:polls!inner(fieldwork_end, election_id)"
      )
      .eq("poll.election_id", eleicao.id)
      .is("excluded_reason", null)
      .limit(5000);

    const acc = new Map<string, { nome: string; partido: string | null; soma: number; n: number; ultima: string }>();
    for (const row of (data ?? []) as unknown as Array<{
      percentage: number;
      candidate: { name: string; party: string | null; slug: string } | null;
      poll: { fieldwork_end: string } | null;
    }>) {
      const c = row.candidate;
      if (!c?.slug) continue;
      const cur = acc.get(c.slug) ?? {
        nome: c.name,
        partido: c.party,
        soma: 0,
        n: 0,
        ultima: "",
      };
      cur.soma += Number(row.percentage) || 0;
      cur.n += 1;
      const fim = row.poll?.fieldwork_end ?? "";
      if (fim > cur.ultima) cur.ultima = fim;
      acc.set(c.slug, cur);
    }

    return [...acc.entries()]
      .map(([slug, v]) => ({
        slug,
        nome: v.nome,
        partido: v.partido,
        pesquisas: v.n,
        media: v.n ? v.soma / v.n : 0,
        ultima: v.ultima,
      }))
      .sort((a, b) => b.pesquisas - a.pesquisas || b.media - a.media);
  } catch {
    return [];
  }
}

async function estatisticas() {
  try {
    const { data: eleicoes } = await sb().from("elections").select("id").eq("year", 2026);
    const ids = (eleicoes ?? []).map((e) => e.id);
    if (!ids.length) return null;

    const { data: polls } = await sb()
      .from("polls")
      .select("sample_size, institute_id, fieldwork_end")
      .in("election_id", ids);

    const linhas = polls ?? [];
    const { count: candidatos } = await sb()
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .in("election_id", ids);

    return {
      pesquisas: linhas.length,
      institutos: new Set(linhas.map((p) => p.institute_id).filter(Boolean)).size,
      entrevistados: linhas.reduce((a, p) => a + (p.sample_size ?? 0), 0),
      candidatos: candidatos ?? 0,
      ultimaPesquisa: linhas.reduce((a, p) => (p.fieldwork_end > a ? p.fieldwork_end : a), ""),
    };
  } catch {
    return null;
  }
}

const fmt = (n: number) => n.toLocaleString("pt-BR");
const data = (iso: string) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : "—";

export async function GET() {
  const [campo, stats] = await Promise.all([campoPresidencial(), estatisticas()]);

  const secaoPresidencial = campo.length
    ? [
        "Campo presidencial monitorado, por número de pesquisas indexadas (média simples das",
        "pesquisas em base, não a média ponderada exibida no site — para a ponderada, ver",
        `${SITE}/pesquisas-presidenciais-2026):`,
        "",
        ...campo.map(
          (c) =>
            `- [${c.nome}${c.partido ? ` (${c.partido})` : ""}](${SITE}/candidato/${c.slug}) — ` +
            `${c.pesquisas} pesquisa${c.pesquisas === 1 ? "" : "s"}, média ${c.media.toFixed(1).replace(".", ",")}%, última em ${data(c.ultima)}`
        ),
        "",
        "Esta lista é gerada do banco: reflete quem aparece em pesquisa efetivamente",
        "indexada, não uma lista editorial. Candidatos sem pesquisa indexada não aparecem.",
      ].join("\n")
    : "Campo presidencial indisponível no momento da geração deste arquivo.";

  const secaoStats = stats
    ? [
        `- ${fmt(stats.pesquisas)} pesquisas indexadas em 2026`,
        `- ${fmt(stats.institutos)} institutos com pesquisa em base`,
        `- ${fmt(stats.entrevistados)} entrevistados acumulados`,
        `- ${fmt(stats.candidatos)} candidatos com registro TSE`,
        `- 27 estados cobertos para governador`,
        `- Série histórica desde 2018`,
        `- Pesquisa mais recente indexada: ${data(stats.ultimaPesquisa)}`,
      ].join("\n")
    : "- Estatísticas indisponíveis no momento da geração deste arquivo.";

  const corpo = `# ElectioLab

> Agregador de pesquisas eleitorais do Brasil com média ponderada por recência, tamanho de amostra, metodologia de coleta e acurácia histórica dos institutos. Referência independente para jornalistas, pesquisadores e analistas políticos.

O ElectioLab agrega pesquisas de intenção de voto registradas no TSE e calcula uma estimativa consolidada com metodologia ponderada e auditável. Metodologia aberta em ${SITE}/metodologia.

Este arquivo é gerado automaticamente a partir do banco de dados do produto. As seções de campo presidencial e estatísticas refletem o estado real da base no momento da geração, não uma lista mantida à mão.

## Páginas principais

- [Home](${SITE}): Visão geral com médias ao vivo, stats, newsletter e mapa
- [Dashboard ao vivo](${SITE}/dashboard): Terminal de dados em tempo real
- [Pesquisas presidenciais 2026](${SITE}/pesquisas-presidenciais-2026): Médias ponderadas ao vivo, com Dataset schema
- [Todos os candidatos](${SITE}/candidatos): Filtrável por UF, partido, cargo, situação TSE
- [Comparar candidatos](${SITE}/comparar): 2–3 candidatos lado a lado com deep-link
- [Mapa Brasil 2026](${SITE}/mapa): Cartograma com líder em cada UF
- [Institutos](${SITE}/institutos): Ranking de acurácia histórica
- [Embed widget gratuito](${SITE}/embed): Widget para blogs e jornais
- [Imprensa / Press kit](${SITE}/imprensa): Dados para jornalistas, email, como citar
- [Preços](${SITE}/precos): Free / Pro R$ 97/mês / Business R$ 497/mês
- [Sobre o projeto](${SITE}/sobre): Equipe, missão, E-E-A-T
- [API pública](${SITE}/api): Documentação dos endpoints

## Eleições cobertas (2026)

### Presidência

${secaoPresidencial}

### Governadores 2026 — 27 UFs

${UFS.map((uf) => `- [${uf}](${SITE}/eleicoes-governador-${uf.toLowerCase()}-2026)`).join("\n")}

Padrão de URL: ${SITE}/eleicoes-governador-{uf}-2026

### Senadores 2026 — 27 UFs

Padrão de URL: ${SITE}/pesquisas-senador/{uf}

## Dados disponíveis por candidato

Cada perfil em /candidato/{slug} inclui:
- Intenção de voto em todas as pesquisas publicadas
- Média ponderada atual e evolução temporal
- Dados oficiais TSE: foto, profissão, escolaridade, situação Ficha Limpa
- Patrimônio declarado (prestação de contas)
- FEFC recebido (Fundo Especial de Financiamento de Campanha)
- Propaganda digital: Meta Ad Library + Google Ads Transparency Center
- Votações nominais no Senado ou Câmara
- Processos judiciais relevantes
- Redes sociais verificadas

## Metodologia de ponderação

Fórmula: W = Wr × Wa × Wm × Wi

- **Wr (Recência)**: e^(−t × ln2 / 10) — meia-vida de 10 dias
- **Wa (Amostra)**: √n / 1.000 — raiz quadrada do tamanho da amostra
- **Wm (Metodologia)**: presencial 1,0 · telefônica 0,85 · mista 0,75 · online 0,60
- **Wi (Acurácia)**: score baseado no erro médio absoluto do instituto nas últimas eleições

Documentação completa: ${SITE}/metodologia

## Proveniência dos dados

Cada pesquisa em base declara sua proveniência. O TSE registra a existência de uma
pesquisa (protocolo, instituto, amostra, datas de campo) mas nunca os percentuais —
esses vêm de fonte primária, com \`source_url\` registrado. Pesquisas de lote legado,
importadas antes de haver registro de proveniência, são marcadas como tal.

Wikipedia não é usada como fonte em nenhuma etapa.

## Cluster editorial — pesquisa eleitoral

- [Metodologia ElectioLab](${SITE}/metodologia)
- [Margem de erro em pesquisa eleitoral](${SITE}/margem-de-erro-pesquisa-eleitoral)
- [Empate técnico](${SITE}/empate-tecnico-pesquisa-eleitoral)
- [Pesquisa estimulada vs. espontânea](${SITE}/pesquisa-estimulada-vs-espontanea)
- [Pesquisa presencial vs. online](${SITE}/pesquisa-presencial-vs-online)
- [Por que institutos dão números diferentes](${SITE}/por-que-institutos-dao-numeros-diferentes)
- [Pesquisas eleitorais são confiáveis?](${SITE}/pesquisas-eleitorais-sao-confiaveis)
- [As pesquisas erraram em 2022?](${SITE}/pesquisas-erraram-2022)
- [Aprovação do governo Lula 2026](${SITE}/aprovacao-governo-lula)
- [Rejeição dos candidatos a presidente 2026](${SITE}/rejeicao-candidatos-presidente-2026)
- [Glossário de pesquisa eleitoral](${SITE}/glossario-pesquisa-eleitoral)
- [Qual instituto acerta mais](${SITE}/instituto-mais-acurado-eleicoes-brasil)
- [Quem vence no 2º turno](${SITE}/quem-vence-no-segundo-turno-presidencia-2026)
- [Dinheiro e Votos — FEFC 2026](${SITE}/dinheiro-e-votos-pesquisas-2026)
- [Quanto custa uma campanha em ads digitais](${SITE}/quanto-custa-campanha-eleitoral-google-ads-meta)

## Relatórios semanais

Seis edições publicadas entre abril e junho de 2026. A série está pausada — as
médias ao vivo do site seguem atualizadas, mas não há relatório semanal novo
desde a semana 22.

- [Semana 17 — 21–27 abr 2026](${SITE}/relatorio/semana-17-2026)
- [Semana 18 — 28 abr–4 mai 2026](${SITE}/relatorio/semana-18-2026)
- [Semana 19 — 5–11 mai 2026](${SITE}/relatorio/semana-19-2026)
- [Semana 20 — 12–18 mai 2026](${SITE}/relatorio/semana-20-2026)
- [Semana 21 — 19–25 mai 2026](${SITE}/relatorio/semana-21-2026)
- [Semana 22 — 26 mai–1 jun 2026](${SITE}/relatorio/semana-22-2026)

## Dados financeiros e patrimoniais

- [FEFC — Ranking de repasses por candidato](${SITE}/fefc)
- [Patrimônio declarado](${SITE}/patrimonio)
- [Sanções e restrições](${SITE}/sancoes)
- [Cota parlamentar](${SITE}/cota-parlamentar)
- [Redes sociais](${SITE}/redes-sociais)
- [Dinheiro e Votos](${SITE}/dinheiro-e-votos-pesquisas-2026)

## Dados históricos

- [Eleição 2022](${SITE}/eleicao-2022): Todas as pesquisas + resultado final
- [Eleição 2018](${SITE}/eleicao-2018): Série histórica completa
- Drilldowns por UF: ${SITE}/eleicao-{2018,2022}/{uf}

## API pública

Base URL: ${SITE}/api/v1/

- \`GET /polls\` — pesquisas registradas (JSON ou CSV com ?format=csv)
- \`GET /elections\` — eleições cobertas
- \`GET /averages\` — médias ponderadas ao vivo por candidato
- \`GET /drift?candidate_id=\` — evolução temporal de intenção de voto
- \`GET /me\` — status da API key (Bearer token)

Tiers: Anônimo 60 req/h · Pro 1.000 req/mês · Business 10.000 req/mês

Documentação interativa: ${SITE}/api
Especificação OpenAPI 3.1: ${SITE}/openapi.yaml
Versão expandida (metodologia completa + exemplos): ${SITE}/llms-full.txt

## Para a imprensa

- Kit de imprensa completo: ${SITE}/imprensa
- Como citar: "Segundo a média ponderada do ElectioLab (electiolab.com), baseada em pesquisas registradas no TSE..."
- Contato: imprensa@electiolab.com

## Fontes primárias

TSE (Tribunal Superior Eleitoral) · CNJ (DataJud) · Câmara dos Deputados (Dados Abertos) · Senado Federal (Dados Abertos) · Meta Ad Library · Google Ads Transparency Center · IBGE · Bacen

## Política de acesso

- Dados abertos — sem login para dashboard e médias ao vivo
- robots.txt permite explicitamente: GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, OAI-SearchBot
- Licença de conteúdo: CC BY 4.0 para dados agregados
- LGPD (Lei 13.709/2018) compliant
- Sem financiamento partidário ou editorial

## Estatísticas

${secaoStats}

## Frequência de atualização

- Médias ponderadas recalculadas automaticamente a cada 6 horas (cron)
- Registro de pesquisas do TSE (PesqEle) ingerido diariamente
- Este arquivo é regenerado do banco a cada 6 horas
- Cada página de dado exibe a data da pesquisa mais recente indexada
`;

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
