import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 30;

// Sem isso, `revalidate` sozinho não registra a rota no pipeline de ISR da
// Vercel — os dados nem existem até o dia da eleição, então não há o que
// pré-renderizar no build.
export async function generateStaticParams() {
  return [];
}

const AMBIENTE = process.env.TSE_AMBIENTE ?? "simulado";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, db: { schema: "apuracao" } },
  );
}

const fmtNum = (n: number | null | undefined) => (n ?? 0).toLocaleString("pt-BR");
const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${Number(n).toFixed(2)}%`;
const fmtDec = (n: number | null) =>
  n === null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Parte inteira do QP maior que as vagas obtidas: só acontece quando faltam candidatos
 * com 10% do QE para ocupar as vagas diretas (art. 108 do Código Eleitoral). */
function limitadoPor10(a: { qp: number | null; vagas: number }): boolean {
  return a.qp !== null && Math.floor(a.qp) > a.vagas;
}

/** Sigla curta da forma de eleição proporcional, para a etiqueta ao lado do nome. */
function etiquetaEleito(situacao: string | null): string | null {
  if (situacao === "Eleito por QP") return "QP";
  if (situacao === "Eleito por média") return "média";
  return null;
}

/** Rótulo de candidato: sempre a partir de `situacao` (o `st` do TSE), nunca de `eleito`
 * (que vem de `e`, e `e="s"` significa "segue" — eleito OU classificado para o 2º turno). */
function badgeCandidato(situacao: string | null): string {
  const s = situacao ?? "";
  if (s.startsWith("Eleito")) return "text-positive font-semibold";
  if (s === "2º turno") return "text-warning font-semibold";
  return "text-muted-foreground";
}

function badgeDisputa(situacao: string | null): { label: string; cls: string } {
  switch (situacao) {
    case "eleito":
      return { label: "Eleito", cls: "text-positive font-semibold" };
    case "segundo_turno":
      return { label: "2º turno", cls: "text-warning font-semibold" };
    case "sem_eleito":
      return { label: "Sem eleito", cls: "text-negative font-semibold" };
    default:
      return { label: "Em apuração", cls: "text-muted-foreground" };
  }
}

type Cargo = { id: number; codigo: number; nome: string; eleicao_id: number };
type Disputa = {
  id: number;
  cargo_id: number;
  uf: string | null;
  vagas: number | null;
  quociente_eleitoral: number | null;
};
type Situacao = {
  disputa_id: number;
  andamento: string | null;
  situacao_tse_derivada: string | null;
  pct_secoes_totalizadas: number | null;
};
type Totalizacao = { disputa_id: number; votos_validos: number | null };
type Candidato = {
  id: number;
  disputa_id: number;
  numero: number | null;
  nome_urna: string;
  partido_sigla: string | null;
  votos_apurados: number;
  pct_tse: number | null;
  situacao: string | null;
  agrupamento_numero: string | null;
};
type Agrupamento = {
  id: number;
  disputa_id: number;
  numero: string;
  tipo: string;
  nome: string | null;
  composicao: string | null;
  vagas_obtidas: number | null;
};
type Partido = {
  disputa_id: number;
  agrupamento_numero: string | null;
  votos_nominais_validos: number | null;
  votos_legenda_total: number | null;
};

/** Linha da tabela de distribuição de vagas (só proporcional). */
type LinhaDistribuicao = {
  id: number;
  numero: string;
  nome: string | null;
  composicao: string | null;
  votosNominais: number;
  votosLegenda: number;
  votos: number;
  /** votos ÷ QE, sem arredondar — a parte inteira são as vagas diretas (art. 107). */
  qp: number | null;
  vagas: number;
  eleitosQp: number;
  eleitosMedia: number;
};

async function getDadosUf(uf: string) {
  const cliente = sb();

  const { data: eleicoes } = await cliente.from("eleicao").select("id").eq("ambiente", AMBIENTE);
  const eleicaoIds = (eleicoes ?? []).map((e) => e.id);
  if (eleicaoIds.length === 0) return null;

  const { data: cargos } = await cliente
    .from("cargo")
    .select("id, codigo, nome, eleicao_id")
    .in("eleicao_id", eleicaoIds)
    .in("codigo", [3, 5, 6, 7, 8]);
  const cargoList = (cargos ?? []) as Cargo[];
  const cargoPorId = new Map(cargoList.map((c) => [c.id, c]));
  const cargoIds = cargoList.map((c) => c.id);
  if (cargoIds.length === 0) return null;

  const { data: disputas } = await cliente
    .from("disputa")
    .select("id, cargo_id, uf, vagas, quociente_eleitoral")
    .eq("uf", uf)
    .in("cargo_id", cargoIds);
  const disputaList = (disputas ?? []) as Disputa[];
  if (disputaList.length === 0) return null;
  const disputaIds = disputaList.map((d) => d.id);

  const candidatosSelect =
    "id, disputa_id, numero, nome_urna, partido_sigla, votos_apurados, pct_tse, situacao, agrupamento_numero";

  // Uma query por disputa (não uma só `.in(disputaIds)`): um UF grande (deputados
  // proporcionais) passa de 3 mil candidatos somados, e o limite padrão de 1000 linhas
  // do PostgREST cortaria silenciosamente as disputas com votos mais baixos (ex.:
  // deputado estadual ficando com zero candidatos enquanto federal, com votos maiores,
  // ocupa as 1000 linhas). Eleitos entram à parte porque no proporcional nem sempre
  // estão entre os mais votados (coeficiente por partido, não ranking geral).
  const [
    { data: situacoes },
    { data: totalizacoes },
    listasPorDisputa,
    { data: agrupamentos },
    { data: partidos },
  ] = await Promise.all([
    cliente
      .from("v_disputa_situacao")
      .select("disputa_id, andamento, situacao_tse_derivada, pct_secoes_totalizadas")
      .in("disputa_id", disputaIds),
    cliente
      .from("v_totalizacao_atual")
      .select("disputa_id, votos_validos")
      .in("disputa_id", disputaIds),
    Promise.all(
      disputaIds.map(async (id) => {
        const [maisVotados, eleitos] = await Promise.all([
          cliente
            .from("votacao_candidato")
            .select(candidatosSelect)
            .eq("disputa_id", id)
            .order("votos_apurados", { ascending: false })
            .limit(15),
          cliente
            .from("votacao_candidato")
            .select(candidatosSelect)
            .eq("disputa_id", id)
            .ilike("situacao", "Eleito%")
            .order("votos_apurados", { ascending: false }),
        ]);
        return {
          disputaId: id,
          maisVotados: (maisVotados.data ?? []) as Candidato[],
          eleitos: (eleitos.data ?? []) as Candidato[],
        };
      }),
    ),
    cliente
      .from("votacao_agrupamento")
      .select("id, disputa_id, numero, tipo, nome, composicao, vagas_obtidas")
      .in("disputa_id", disputaIds),
    // Votos por agrupamento vêm da soma dos partidos-membros: o TSE só manda
    // `votacao_agrupamento.votos_*` para federação/coligação — partido isolado vem null
    // (mesma regra de `camara-projecao.ts`). ~30 partidos × 5 disputas, abaixo do limite
    // de 1000 linhas do PostgREST.
    cliente
      .from("votacao_partido")
      .select("disputa_id, agrupamento_numero, votos_nominais_validos, votos_legenda_total")
      .in("disputa_id", disputaIds),
  ]);

  const situacaoPorDisputa = new Map(
    ((situacoes ?? []) as Situacao[]).map((s) => [s.disputa_id, s]),
  );
  const validosPorDisputa = new Map(
    ((totalizacoes ?? []) as Totalizacao[]).map((t) => [t.disputa_id, t.votos_validos]),
  );
  const listaPorDisputa = new Map(listasPorDisputa.map((l) => [l.disputaId, l]));
  const agrupamentosPorDisputa = new Map<number, Agrupamento[]>();
  for (const a of (agrupamentos ?? []) as Agrupamento[]) {
    agrupamentosPorDisputa.set(a.disputa_id, [
      ...(agrupamentosPorDisputa.get(a.disputa_id) ?? []),
      a,
    ]);
  }
  const votosPorAgrupamento = new Map<string, { nominais: number; legenda: number }>();
  for (const p of (partidos ?? []) as Partido[]) {
    if (!p.agrupamento_numero) continue;
    const chave = `${p.disputa_id}:${p.agrupamento_numero}`;
    const atual = votosPorAgrupamento.get(chave) ?? { nominais: 0, legenda: 0 };
    atual.nominais += p.votos_nominais_validos ?? 0;
    atual.legenda += p.votos_legenda_total ?? 0;
    votosPorAgrupamento.set(chave, atual);
  }

  const secoes = disputaList
    .map((d) => {
      const cargo = cargoPorId.get(d.cargo_id)!;
      const eleitos = listaPorDisputa.get(d.id)?.eleitos ?? [];
      const qe = d.quociente_eleitoral;
      const distribuicao: LinhaDistribuicao[] = (agrupamentosPorDisputa.get(d.id) ?? [])
        .map((a) => {
          const v = votosPorAgrupamento.get(`${d.id}:${a.numero}`) ?? { nominais: 0, legenda: 0 };
          const votos = v.nominais + v.legenda;
          const doAgrupamento = eleitos.filter((c) => c.agrupamento_numero === a.numero);
          return {
            id: a.id,
            numero: a.numero,
            nome: a.nome,
            composicao: a.composicao,
            votosNominais: v.nominais,
            votosLegenda: v.legenda,
            votos,
            qp: qe ? votos / qe : null,
            vagas: a.vagas_obtidas ?? 0,
            eleitosQp: doAgrupamento.filter((c) => c.situacao === "Eleito por QP").length,
            eleitosMedia: doAgrupamento.filter((c) => c.situacao === "Eleito por média").length,
          };
        })
        .sort((a, b) => b.vagas - a.vagas || b.votos - a.votos);
      return {
        cargo,
        disputaId: d.id,
        vagas: d.vagas,
        quocienteEleitoral: qe,
        votosValidos: validosPorDisputa.get(d.id) ?? null,
        situacao: situacaoPorDisputa.get(d.id) ?? null,
        maisVotados: listaPorDisputa.get(d.id)?.maisVotados ?? [],
        eleitos,
        distribuicao,
      };
    })
    .sort((a, b) => a.cargo.codigo - b.cargo.codigo);

  return { secoes };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uf: string }>;
}): Promise<Metadata> {
  const { uf } = await params;
  return { title: `Apuração — ${uf.toUpperCase()} — Eleições 2026` };
}

export default async function ApuracaoUfPage({
  params,
}: {
  params: Promise<{ uf: string }>;
}) {
  const { uf: ufParam } = await params;
  const uf = ufParam.toLowerCase();
  const dados = await getDadosUf(uf);
  if (!dados) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/apuracao" className="text-sm font-semibold">
            ← Apuração
          </Link>
          <span className="text-xs text-muted-foreground font-mono uppercase">{uf}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        <h1 className="text-2xl font-bold tracking-tight uppercase">{uf}</h1>

        {dados.secoes.map((s) => {
          const badge = badgeDisputa(s.situacao?.situacao_tse_derivada ?? null);
          const eleitos = s.eleitos;
          const proporcional = s.cargo.codigo >= 6;
          const finalizada = s.situacao?.andamento === "f";
          const qe = s.quocienteEleitoral;
          return (
            <section key={s.disputaId}>
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="text-xl font-bold tracking-tight">{s.cargo.nome}</h2>
                <span className={`text-sm ${badge.cls}`}>
                  {badge.label} ·{" "}
                  <span className="font-mono tabular-nums font-semibold text-foreground">
                    {fmtPct(s.situacao?.pct_secoes_totalizadas)}
                  </span>{" "}
                  das seções
                </span>
              </div>

              {/* Majoritário: lista corrida. Proporcional: agrupado por partido, logo abaixo. */}
              {!proporcional && eleitos.length > 0 && (
                <p className="mb-3 text-sm">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">
                    Eleitos
                  </span>
                  {eleitos.map((c) => (
                    <span key={c.id} className="text-positive font-semibold mr-3">
                      {c.nome_urna} ({c.partido_sigla})
                    </span>
                  ))}
                </p>
              )}

              {proporcional && eleitos.length > 0 && (
                <div className="rounded-lg border border-border bg-card px-4 py-3 mb-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Eleitos ({eleitos.length}) — por partido / federação
                  </p>
                  <div className="space-y-3">
                    {s.distribuicao
                      .filter((a) => eleitos.some((c) => c.agrupamento_numero === a.numero))
                      .map((a) => (
                        <div key={a.id}>
                          <p className="text-xs font-semibold mb-1">
                            {a.nome}{" "}
                            <span className="text-muted-foreground font-normal">
                              · {a.vagas} {a.vagas === 1 ? "vaga" : "vagas"}
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {eleitos
                              .filter((c) => c.agrupamento_numero === a.numero)
                              .map((c) => (
                                <span key={c.id} className="text-sm">
                                  <span className="text-positive font-semibold">{c.nome_urna}</span>{" "}
                                  <span className="text-xs text-muted-foreground">
                                    {c.partido_sigla} · {fmtNum(c.votos_apurados)}
                                    {etiquetaEleito(c.situacao) && (
                                      <span className="ml-1 rounded border border-border px-1 font-mono">
                                        {etiquetaEleito(c.situacao)}
                                      </span>
                                    )}
                                  </span>
                                </span>
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-border bg-card overflow-hidden mb-4">
                <div className="hidden md:flex items-center px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                  <span className="w-20 shrink-0">Nº</span>
                  <span className="flex-1">Candidato (mais votados)</span>
                  <span className="w-28">Partido</span>
                  <span className="w-24 text-right">Votos</span>
                  <span className="w-20 text-right">%</span>
                  <span className="w-24 text-right">Situação</span>
                </div>
                {s.maisVotados.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col md:flex-row md:items-center px-4 py-2.5 text-sm border-b border-border/30 last:border-0"
                  >
                    <span className="md:w-20 md:shrink-0 font-mono tabular-nums text-muted-foreground">
                      {c.numero}
                    </span>
                    <span className="flex-1">{c.nome_urna}</span>
                    <span className="md:w-28 text-xs text-muted-foreground">
                      {c.partido_sigla ?? "—"}
                    </span>
                    <span className="md:w-24 md:text-right font-mono tabular-nums">
                      {fmtNum(c.votos_apurados)}
                    </span>
                    <span className="md:w-20 md:text-right font-mono tabular-nums">
                      {fmtPct(c.pct_tse)}
                    </span>
                    <span className={`md:w-24 md:text-right text-xs ${badgeCandidato(c.situacao)}`}>
                      {c.situacao ?? "—"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Distribuição de vagas — só no proporcional (deputados). */}
              {proporcional && s.distribuicao.length > 0 && (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                      Como as vagas foram distribuídas{!finalizada && " (parcial)"}
                    </p>
                    {qe ? (
                      <p className="text-sm">
                        Quociente eleitoral (QE):{" "}
                        <span className="font-mono tabular-nums font-semibold">{fmtNum(qe)}</span>
                        {s.votosValidos && s.vagas ? (
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            = {fmtNum(s.votosValidos)} votos válidos ÷ {s.vagas} vagas
                          </span>
                        ) : null}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Quociente eleitoral ainda não divulgado.</p>
                    )}
                    {!finalizada && (
                      <p className="text-xs text-muted-foreground mt-1">
                        O TSE recalcula a distribuição a cada atualização; os números mudam até o fim da
                        apuração.
                      </p>
                    )}
                  </div>
                  <div className="hidden md:flex items-center px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <span className="flex-1">Partido / Federação</span>
                    <span className="w-28 text-right">Votos</span>
                    <span className="w-20 text-right">QP</span>
                    <span className="w-16 text-right">Vagas</span>
                    <span className="w-28 text-right">QP · média</span>
                  </div>
                  {s.distribuicao
                    .filter((a) => a.votos > 0 || a.vagas > 0)
                    .map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-col md:flex-row md:items-center px-4 py-2.5 text-sm border-b border-border/30 last:border-0"
                      >
                        <span className="flex-1">
                          {a.nome}{" "}
                          {a.composicao && a.composicao !== a.nome ? (
                            <span className="text-xs text-muted-foreground">({a.composicao})</span>
                          ) : null}
                        </span>
                        <span
                          className="md:w-28 md:text-right font-mono tabular-nums"
                          title={`${fmtNum(a.votosNominais)} nominais + ${fmtNum(a.votosLegenda)} de legenda`}
                        >
                          {fmtNum(a.votos)}
                        </span>
                        <span className="md:w-20 md:text-right font-mono tabular-nums text-muted-foreground">
                          {fmtDec(a.qp)}
                          {limitadoPor10(a) && <span className="text-warning">*</span>}
                        </span>
                        <span className="md:w-16 md:text-right font-mono tabular-nums font-semibold">
                          {a.vagas}
                        </span>
                        <span className="md:w-28 md:text-right font-mono tabular-nums text-xs text-muted-foreground">
                          {finalizada ? `${a.eleitosQp} · ${a.eleitosMedia}` : "—"}
                        </span>
                      </div>
                    ))}
                  {s.distribuicao.some(limitadoPor10) && (
                    <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
                      <span className="text-warning">*</span> Recebeu menos vagas do que o QP indica: o
                      partido não teve candidatos suficientes com ao menos 10% do QE em votos (art. 108),
                      e as vagas restantes foram para outros partidos.
                    </p>
                  )}
                  <details className="px-4 py-3 text-sm border-t border-border">
                    <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">
                      Como funciona o cálculo
                    </summary>
                    <div className="mt-3 space-y-2 text-muted-foreground">
                      <p>
                        <strong className="text-foreground">Quociente eleitoral (QE)</strong> — votos válidos
                        da disputa divididos pelo número de vagas (art. 106 do Código Eleitoral).
                      </p>
                      <p>
                        <strong className="text-foreground">Quociente partidário (QP)</strong> — votos do
                        partido ou federação (nominais + legenda) divididos pelo QE. A parte inteira é o
                        número de vagas que ele conquista direto (art. 107). Só ocupa essas vagas quem
                        tiver ao menos 10% do QE em votos nominais (art. 108)
                        {qe ? <> — aqui, {fmtNum(Math.ceil(qe * 0.1))} votos</> : null}.
                      </p>
                      <p>
                        <strong className="text-foreground">Sobras (eleito por média)</strong> — as vagas
                        que restam vão, uma a uma, para quem tiver a maior média: votos ÷ (vagas já obtidas
                        + 1) (art. 109). Disputam as sobras partidos com ao menos 80% do QE
                        {qe ? <> ({fmtNum(Math.ceil(qe * 0.8))} votos)</> : null} e candidatos com ao menos
                        20% do QE{qe ? <> ({fmtNum(Math.ceil(qe * 0.2))} votos)</> : null}. Se ainda
                        sobrar vaga, ela é distribuída pelas maiores médias sem essas exigências.
                      </p>
                      <p className="text-xs">
                        Por isso um candidato muito votado pode ficar de fora e outro, com menos votos,
                        ser eleito: o que conta primeiro é a votação do partido.
                      </p>
                    </div>
                  </details>
                </div>
              )}
            </section>
          );
        })}
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          Fonte: TSE — dados oficiais sem alteração
        </div>
      </footer>
    </div>
  );
}
