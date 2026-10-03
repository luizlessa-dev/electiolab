import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Apuração ao vivo — Eleições 2026",
  description:
    "Acompanhamento em tempo real da apuração das Eleições Gerais 2026, direto do TSE.",
};

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
const fmtHora = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/** Rótulo de candidato: sempre a partir de `situacao` (o `st` do TSE), nunca de `eleito`
 * (que vem de `e`, e `e="s"` significa "segue" — eleito OU classificado para o 2º turno). */
function badgeCandidato(situacao: string | null): string {
  const s = situacao ?? "";
  if (s.startsWith("Eleito")) return "text-positive font-semibold";
  if (s === "2º turno") return "text-warning font-semibold";
  return "text-muted-foreground";
}

/** Situação derivada da disputa inteira (`v_disputa_situacao`), não do candidato. */
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
  abrangencia: string;
  tipo_abrangencia: string;
};
type Totalizacao = {
  disputa_id: number;
  pct_secoes_totalizadas: number | null;
  data_hora_total: string | null;
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
type Situacao = {
  disputa_id: number;
  situacao_tse_derivada: string | null;
  pct_secoes_totalizadas: number | null;
};

async function getDados() {
  const cliente = sb();

  const { data: eleicoes } = await cliente.from("eleicao").select("id").eq("ambiente", AMBIENTE);
  const eleicaoIds = (eleicoes ?? []).map((e) => e.id);
  if (eleicaoIds.length === 0) return null;

  const { data: cargos } = await cliente
    .from("cargo")
    .select("id, codigo, nome, eleicao_id")
    .in("eleicao_id", eleicaoIds)
    .in("codigo", [1, 3, 5]);
  const cargoList = (cargos ?? []) as Cargo[];
  const cargoPorId = new Map(cargoList.map((c) => [c.id, c]));
  const cargoIds = cargoList.map((c) => c.id);
  if (cargoIds.length === 0) return null;

  const { data: disputas } = await cliente
    .from("disputa")
    .select("id, cargo_id, uf, abrangencia, tipo_abrangencia")
    .in("cargo_id", cargoIds);
  const disputaList = (disputas ?? []) as Disputa[];
  const disputaIds = disputaList.map((d) => d.id);
  if (disputaIds.length === 0) return null;

  const [{ data: totalizacoes }, { data: situacoes }, { data: candidatos }] = await Promise.all([
    cliente
      .from("v_totalizacao_atual")
      .select("disputa_id, pct_secoes_totalizadas, data_hora_total")
      .in("disputa_id", disputaIds),
    cliente
      .from("v_disputa_situacao")
      .select("disputa_id, situacao_tse_derivada, pct_secoes_totalizadas")
      .in("disputa_id", disputaIds),
    cliente
      .from("votacao_candidato")
      .select("id, disputa_id, numero, nome_urna, partido_sigla, votos_apurados, pct_tse, situacao")
      .in("disputa_id", disputaIds)
      .order("votos_apurados", { ascending: false }),
  ]);

  const disputaPresidenteBr = disputaList.find(
    (d) => cargoPorId.get(d.cargo_id)?.codigo === 1 && d.abrangencia === "br",
  );
  const totalizacaoPresidente = disputaPresidenteBr
    ? ((totalizacoes ?? []) as Totalizacao[]).find((t) => t.disputa_id === disputaPresidenteBr.id)
    : undefined;
  const candidatosPresidente = disputaPresidenteBr
    ? ((candidatos ?? []) as Candidato[]).filter((c) => c.disputa_id === disputaPresidenteBr.id)
    : [];

  const disputasUf = disputaList.filter((d) => {
    const codigo = cargoPorId.get(d.cargo_id)?.codigo;
    return d.tipo_abrangencia === "uf" && (codigo === 3 || codigo === 5);
  });
  const situacaoPorDisputa = new Map(
    ((situacoes ?? []) as Situacao[]).map((s) => [s.disputa_id, s]),
  );

  const porUf = new Map<string, { governador?: Situacao; senado?: Situacao }>();
  for (const d of disputasUf) {
    const uf = (d.uf ?? "").toLowerCase();
    if (!uf) continue;
    const codigo = cargoPorId.get(d.cargo_id)?.codigo;
    const s = situacaoPorDisputa.get(d.id);
    const atual = porUf.get(uf) ?? {};
    if (codigo === 3) atual.governador = s;
    if (codigo === 5) atual.senado = s;
    porUf.set(uf, atual);
  }

  return {
    totalizacaoPresidente,
    candidatosPresidente,
    porUf: [...porUf.entries()].sort(([a], [b]) => a.localeCompare(b)),
  };
}

export default async function ApuracaoPage() {
  const dados = await getDados();

  if (!dados) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-muted-foreground">Sem dados de apuração ainda.</p>
      </main>
    );
  }

  const { totalizacaoPresidente, candidatosPresidente, porUf } = dados;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold">
            ElectioLab
          </Link>
          <span className="text-xs text-muted-foreground font-mono">
            Apuração 2026 · {AMBIENTE}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Presidente — Brasil</h1>
          <p className="text-xs text-muted-foreground font-mono mb-4">
            Fonte: TSE — atualizado às {fmtHora(totalizacaoPresidente?.data_hora_total)} ·{" "}
            {fmtPct(totalizacaoPresidente?.pct_secoes_totalizadas)} das seções totalizadas
          </p>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="hidden md:flex items-center px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
              <span className="w-10">Nº</span>
              <span className="flex-1">Candidato</span>
              <span className="w-16">Partido</span>
              <span className="w-28 text-right">Votos</span>
              <span className="w-20 text-right">% (TSE)</span>
              <span className="w-28 text-right">Situação</span>
            </div>
            {candidatosPresidente.map((c) => (
              <div
                key={c.id}
                className="flex flex-col md:flex-row md:items-center px-4 py-3 text-sm border-b border-border/30 last:border-0"
              >
                <span className="md:w-10 font-mono tabular-nums text-muted-foreground">
                  {c.numero}
                </span>
                <span className="flex-1 font-semibold">{c.nome_urna}</span>
                <span className="md:w-16 text-xs text-muted-foreground">
                  {c.partido_sigla ?? "—"}
                </span>
                <span className="md:w-28 md:text-right font-mono tabular-nums">
                  {fmtNum(c.votos_apurados)}
                </span>
                <span className="md:w-20 md:text-right font-mono tabular-nums text-xs text-muted-foreground">
                  {fmtPct(c.pct_tse)}
                </span>
                <span className={`md:w-28 md:text-right text-xs ${badgeCandidato(c.situacao)}`}>
                  {c.situacao ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight mb-3">Deputados</h2>
          <Link
            href="/apuracao/camara"
            className="block rounded-lg border border-border bg-card px-4 py-3 mb-3 hover:bg-muted/30 transition-colors"
          >
            <span className="text-sm font-semibold">Câmara dos Deputados</span>
            <span className="block text-xs text-muted-foreground">
              Projeção da bancada federal (cálculo ElectioLab, a partir da apuração do TSE)
            </span>
          </Link>
          <p className="text-xs text-muted-foreground mb-2">
            Deputado federal, estadual e distrital, por UF:
          </p>
          <div className="flex flex-wrap gap-2">
            {porUf.map(([uf]) => (
              <Link
                key={uf}
                href={`/apuracao/${uf}`}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-mono font-semibold uppercase hover:bg-muted/30 transition-colors"
              >
                {uf}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight mb-3">Governador e Senado, por UF</h2>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="hidden md:flex items-center px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
              <span className="w-16">UF</span>
              <span className="flex-1">Governador</span>
              <span className="flex-1">Senado</span>
            </div>
            {porUf.map(([uf, s]) => {
              const gov = badgeDisputa(s.governador?.situacao_tse_derivada ?? null);
              const sen = badgeDisputa(s.senado?.situacao_tse_derivada ?? null);
              return (
                <Link
                  key={uf}
                  href={`/apuracao/${uf}`}
                  className="flex flex-col md:flex-row md:items-center px-4 py-3 text-sm border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <span className="md:w-16 font-mono font-semibold uppercase">{uf}</span>
                  <span className={`flex-1 text-xs ${gov.cls}`}>
                    {gov.label} · {fmtPct(s.governador?.pct_secoes_totalizadas)}
                  </span>
                  <span className={`flex-1 text-xs ${sen.cls}`}>
                    {sen.label} · {fmtPct(s.senado?.pct_secoes_totalizadas)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          Fonte: TSE — dados oficiais sem alteração
        </div>
      </footer>
    </div>
  );
}
