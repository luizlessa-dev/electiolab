import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, CalendarClock, ArrowRight, Info } from "lucide-react";
import {
  UFS_SEGUNDO_TURNO,
  UF_NOME,
  diasParaSegundoTurno,
  getEstadoSegundoTurno,
  getPresidenteSegundoTurno,
  getResultadosGovernador1T,
} from "@/lib/segundo-turno";
import { Matchup, fmtData } from "@/components/segundo-turno/matchup";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: { absolute: "2º turno 2026: pesquisas para Presidente e Governador | ElectioLab" },
  description:
    "Pesquisas do 2º turno de 25/10/2026: Lula × Flávio Bolsonaro para presidente e os 7 estados com segundo turno para governador (AC, AM, DF, ES, RJ, RN e TO).",
  alternates: { canonical: "https://electiolab.com/segundo-turno" },
  openGraph: {
    title: "2º turno 2026: pesquisas para Presidente e Governador | ElectioLab",
    description: "Média das pesquisas e resultado do 1º turno para cada disputa que vai ao 2º turno em 25/10.",
    url: "https://electiolab.com/segundo-turno",
  },
};

const COR_LULA = "#dc2626";
const COR_FLAVIO = "#2563eb";

export default async function SegundoTurnoPage() {
  const resultados = await getResultadosGovernador1T();
  const [pres, estados] = await Promise.all([
    getPresidenteSegundoTurno(),
    Promise.all(UFS_SEGUNDO_TURNO.map((uf) => getEstadoSegundoTurno(uf, resultados))),
  ]);
  const dias = diasParaSegundoTurno();
  const eleitos = Object.values(resultados)
    .filter((r) => r.situacao === "eleito")
    .sort((a, b) => (UF_NOME[a.uf] ?? a.uf).localeCompare(UF_NOME[b.uf] ?? b.uf, "pt-BR"));

  const semPesquisaNova = pres.novasPosPrimeiroTurno === 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><span className="font-bold text-sm">ElectioLab</span></Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowLeft className="h-3 w-3" /> Voltar</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-14">
        <div className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-primary flex items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5" /> Eleições 2026 · 2º turno em 25 de outubro
            {dias > 0 && <span className="text-muted-foreground">· faltam {dias} {dias === 1 ? "dia" : "dias"}</span>}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas do 2º turno: Presidente e Governador</h1>
          <p className="text-muted-foreground max-w-2xl">
            O 1º turno fechou em 04/10. Seguem para 25/10 a disputa presidencial e a de governador em sete
            estados. As outras vinte unidades da federação já elegeram governador.
          </p>
        </div>

        {/* Presidente */}
        <section className="space-y-4" aria-labelledby="presidente">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="presidente" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Presidente</h2>
            <Link href="/quem-vence-no-segundo-turno-presidencia-2026" className="text-xs text-primary inline-flex items-center gap-1">
              Análise completa <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 space-y-5">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Resultado do 1º turno</p>
                {pres.primeiroTurno && (
                  <Matchup
                    lados={[
                      { nome: "Flávio Bolsonaro", partido: "PL", pct: pres.primeiroTurno.flavio, cor: COR_FLAVIO },
                      { nome: "Lula", partido: "PT", pct: pres.primeiroTurno.lula, cor: COR_LULA },
                    ]}
                  />
                )}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Média das pesquisas{semPesquisaNova ? " (anteriores ao 1º turno)" : ""}
                </p>
                {pres.lula && pres.flavio ? (
                  <Matchup
                    lados={[
                      { nome: "Flávio Bolsonaro", partido: "PL", pct: pres.flavio.pct, cor: COR_FLAVIO },
                      { nome: "Lula", partido: "PT", pct: pres.lula.pct, cor: COR_LULA },
                    ]}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Sem média disponível.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {pres.pollsNaMedia} pesquisas na média
                  {pres.ultimaPesquisa ? ` · última publicada em ${fmtData(pres.ultimaPesquisa)}` : ""}
                </p>
              </div>
            </div>
            {semPesquisaNova && (
              <p className="text-xs text-muted-foreground flex gap-2 border-t border-border pt-3">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Ainda não há pesquisa de 2º turno publicada depois de 04/10. A média acima usa confrontos
                Lula × Flávio testados antes do 1º turno e será recalculada assim que as primeiras
                pesquisas pós-eleição forem registradas.
              </p>
            )}
          </div>
        </section>

        {/* Governadores */}
        <section className="space-y-4" aria-labelledby="governadores">
          <h2 id="governadores" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Governador: 7 estados vão ao 2º turno
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {estados.map((e) => {
              const lados = e.media
                ? e.media.map((m) => ({ nome: m.nome, pct: m.pct, cor: m.cor }))
                : e.primeiroTurno.map((f) => ({ nome: f.nome, partido: f.partido, pct: f.pct }));
              const rotulo = e.media
                ? `Média das pesquisas de 2º turno (${e.pesquisas.length})`
                : "Resultado do 1º turno";
              return (
                <Link
                  key={e.uf}
                  href={`/segundo-turno/${e.uf}`}
                  className="rounded-lg border border-border bg-card p-5 space-y-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{e.nome}</span>
                    <span className="text-xs font-mono text-muted-foreground uppercase">{e.uf}</span>
                  </div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{rotulo}</p>
                  {lados.length === 2 ? <Matchup lados={lados} /> : null}
                  <p className="text-xs text-primary inline-flex items-center gap-1">
                    Ver pesquisas <ArrowRight className="h-3 w-3" />
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Eleitos no 1º turno */}
        {eleitos.length > 0 && (
          <section className="space-y-4" aria-labelledby="eleitos">
            <h2 id="eleitos" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Governadores eleitos no 1º turno ({eleitos.length})
            </h2>
            <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 text-sm">
              {eleitos.map((r) => (
                <li key={r.uf} className="flex items-baseline justify-between gap-3 border-b border-border/50 py-1.5">
                  <Link href={`/eleicoes-governador-${r.uf}-2026`} className="hover:text-primary">
                    {UF_NOME[r.uf] ?? r.uf.toUpperCase()}
                  </Link>
                  <span className="text-muted-foreground text-right">
                    {r.top[0]?.nome} ({r.top[0]?.partido}) · {r.top[0]?.pct.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-xs text-muted-foreground">
          Resultado do 1º turno: apuração oficial do TSE (100% das seções). Pesquisas: registros
          verificados no TSE; veja a <Link href="/metodologia" className="underline underline-offset-2">metodologia</Link>.
        </p>
      </main>
    </div>
  );
}
