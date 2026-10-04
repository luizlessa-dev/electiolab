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
type Disputa = { id: number; cargo_id: number; uf: string | null };
type Situacao = {
  disputa_id: number;
  situacao_tse_derivada: string | null;
  pct_secoes_totalizadas: number | null;
};
type Candidato = {
  id: number;
  disputa_id: number;
  numero: number | null;
  nome_urna: string;
  partido_sigla: string | null;
  votos_apurados: number;
  pct_tse: number | null;
  situacao: string | null;
};
type Agrupamento = {
  id: number;
  disputa_id: number;
  tipo: string;
  nome: string | null;
  composicao: string | null;
  vagas_obtidas: number | null;
  votos_nominais_validos: number | null;
  votos_legenda_total: number | null;
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
    .select("id, cargo_id, uf")
    .eq("uf", uf)
    .in("cargo_id", cargoIds);
  const disputaList = (disputas ?? []) as Disputa[];
  if (disputaList.length === 0) return null;
  const disputaIds = disputaList.map((d) => d.id);

  const candidatosSelect =
    "id, disputa_id, numero, nome_urna, partido_sigla, votos_apurados, pct_tse, situacao";

  // Uma query por disputa (não uma só `.in(disputaIds)`): um UF grande (deputados
  // proporcionais) passa de 3 mil candidatos somados, e o limite padrão de 1000 linhas
  // do PostgREST cortaria silenciosamente as disputas com votos mais baixos (ex.:
  // deputado estadual ficando com zero candidatos enquanto federal, com votos maiores,
  // ocupa as 1000 linhas). Eleitos entram à parte porque no proporcional nem sempre
  // estão entre os mais votados (coeficiente por partido, não ranking geral).
  const [{ data: situacoes }, listasPorDisputa, { data: agrupamentos }] = await Promise.all([
    cliente
      .from("v_disputa_situacao")
      .select("disputa_id, situacao_tse_derivada, pct_secoes_totalizadas")
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
            .ilike("situacao", "Eleito%"),
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
      .select(
        "id, disputa_id, tipo, nome, composicao, vagas_obtidas, votos_nominais_validos, votos_legenda_total",
      )
      .in("disputa_id", disputaIds),
  ]);

  const situacaoPorDisputa = new Map(
    ((situacoes ?? []) as Situacao[]).map((s) => [s.disputa_id, s]),
  );
  const listaPorDisputa = new Map(listasPorDisputa.map((l) => [l.disputaId, l]));
  const agrupamentosPorDisputa = new Map<number, Agrupamento[]>();
  for (const a of (agrupamentos ?? []) as Agrupamento[]) {
    agrupamentosPorDisputa.set(a.disputa_id, [
      ...(agrupamentosPorDisputa.get(a.disputa_id) ?? []),
      a,
    ]);
  }

  const secoes = disputaList
    .map((d) => {
      const cargo = cargoPorId.get(d.cargo_id)!;
      return {
        cargo,
        disputaId: d.id,
        situacao: situacaoPorDisputa.get(d.id) ?? null,
        maisVotados: listaPorDisputa.get(d.id)?.maisVotados ?? [],
        eleitos: listaPorDisputa.get(d.id)?.eleitos ?? [],
        agrupamentos: (agrupamentosPorDisputa.get(d.id) ?? [])
          .slice()
          .sort(
            (a, b) =>
              (b.votos_nominais_validos ?? 0) +
              (b.votos_legenda_total ?? 0) -
              ((a.votos_nominais_validos ?? 0) + (a.votos_legenda_total ?? 0)),
          ),
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

              {eleitos.length > 0 && (
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

              {/* Votação por partido/federação — só faz sentido no proporcional (deputados). */}
              {s.cargo.codigo >= 6 && s.agrupamentos.length > 0 && (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="hidden md:flex items-center px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                    <span className="flex-1">Partido / Federação</span>
                    <span className="w-20 text-right">Vagas</span>
                    <span className="w-28 text-right">Votos nominais</span>
                    <span className="w-28 text-right">Legenda</span>
                  </div>
                  {s.agrupamentos.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-col md:flex-row md:items-center px-4 py-2.5 text-sm border-b border-border/30 last:border-0"
                    >
                      <span className="flex-1">
                        {a.nome}{" "}
                        {a.composicao ? (
                          <span className="text-xs text-muted-foreground">({a.composicao})</span>
                        ) : null}
                      </span>
                      <span className="md:w-20 md:text-right font-mono tabular-nums">
                        {a.vagas_obtidas ?? 0}
                      </span>
                      <span className="md:w-28 md:text-right font-mono tabular-nums">
                        {fmtNum(a.votos_nominais_validos)}
                      </span>
                      <span className="md:w-28 md:text-right font-mono tabular-nums">
                        {fmtNum(a.votos_legenda_total)}
                      </span>
                    </div>
                  ))}
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
