import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, ArrowLeft, CalendarClock, Info } from "lucide-react";
import {
  UFS_SEGUNDO_TURNO,
  diasParaSegundoTurno,
  getEstadoSegundoTurno,
  isUfSegundoTurno,
  UF_NOME,
} from "@/lib/segundo-turno";
import { Matchup, fmtData } from "@/components/segundo-turno/matchup";

export const revalidate = 1800;
export const dynamicParams = false;

export function generateStaticParams() {
  return UFS_SEGUNDO_TURNO.map((uf) => ({ uf }));
}

type Props = { params: Promise<{ uf: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uf } = await params;
  if (!isUfSegundoTurno(uf)) return {};
  const e = await getEstadoSegundoTurno(uf);
  const par = e.primeiroTurno.map((f) => f.nome).join(" × ");
  const title = `2º turno governador ${UF_NOME[uf]} 2026: ${par} | ElectioLab`;
  const url = `https://electiolab.com/segundo-turno/${uf}`;
  return {
    title: { absolute: title },
    description: `Pesquisas do 2º turno para governador de ${UF_NOME[uf]} em 25/10/2026: ${par}. Resultado do 1º turno e média das pesquisas.`,
    alternates: { canonical: url },
    openGraph: { title, url },
  };
}

export default async function SegundoTurnoUfPage({ params }: Props) {
  const { uf } = await params;
  if (!isUfSegundoTurno(uf)) notFound();
  const e = await getEstadoSegundoTurno(uf);
  const dias = diasParaSegundoTurno();
  const cor = new Map(e.candidatos.map((c) => [c.slug, c.cor]));
  const partido = new Map(e.candidatos.map((c) => [c.slug, c.partido]));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><span className="font-bold text-sm">ElectioLab</span></Link>
          <Link href="/segundo-turno" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowLeft className="h-3 w-3" /> 2º turno</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <div className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-primary flex items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5" /> Governador {e.nome} · 2º turno em 25/10
            {dias > 0 && <span className="text-muted-foreground">· faltam {dias} {dias === 1 ? "dia" : "dias"}</span>}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            {e.primeiroTurno.map((f) => f.nome).join(" × ")}
          </h1>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resultado do 1º turno (04/10)</h2>
          <div className="rounded-lg border border-border bg-card p-5">
            <Matchup lados={e.primeiroTurno.map((f) => ({ nome: f.nome, partido: f.partido, pct: f.pct }))} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pesquisas do 2º turno</h2>
          {e.media ? (
            <>
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Média da última pesquisa de cada instituto
                </p>
                <Matchup
                  lados={e.media.map((m) => ({ nome: m.nome, partido: partido.get(m.slug), pct: m.pct, cor: m.cor }))}
                />
              </div>
              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2">Instituto</th>
                      <th className="text-left px-4 py-2">Publicada</th>
                      {e.candidatos.map((c) => <th key={c.slug} className="text-right px-4 py-2">{c.nome}</th>)}
                      <th className="text-right px-4 py-2">Amostra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.pesquisas.map((p, i) => (
                      <tr key={`${p.instituto}-${p.data}-${i}`} className="border-t border-border">
                        <td className="px-4 py-2">{p.instituto}</td>
                        <td className="px-4 py-2 font-mono text-xs">{fmtData(p.data)}</td>
                        {e.candidatos.map((c) => (
                          <td key={c.slug} className="px-4 py-2 text-right font-mono tabular-nums" style={{ color: cor.get(c.slug) ?? undefined }}>
                            {p.pcts.find((x) => x.slug === c.slug)?.pct.toFixed(1) ?? "—"}%
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                          {p.amostra?.toLocaleString("pt-BR") ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <p className="text-sm text-muted-foreground flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                Nenhuma pesquisa de 2º turno publicada depois de 04/10 até agora. Esta página atualiza
                sozinha quando a primeira for registrada.
              </p>
              {e.hipoteticas && (
                <div className="space-y-3 border-t border-border pt-4">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Confronto testado antes do 1º turno · {e.hipoteticas.polls}{" "}
                    {e.hipoteticas.polls === 1 ? "pesquisa" : "pesquisas"} · última em {fmtData(e.hipoteticas.ultima)}
                  </p>
                  <Matchup
                    lados={e.hipoteticas.pcts.map((m) => ({
                      nome: m.nome, partido: partido.get(m.slug), pct: m.pct, cor: cor.get(m.slug),
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Referência apenas: o cenário mudou com o resultado de 04/10.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        <nav className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground border-t border-border pt-6">
          <Link href="/segundo-turno" className="hover:text-primary">Todos os 2º turnos</Link>
          <Link href="/quem-vence-no-segundo-turno-presidencia-2026" className="hover:text-primary">Presidente</Link>
          <Link href={`/eleicoes-governador-${uf}-2026`} className="hover:text-primary">Histórico da disputa em {e.nome}</Link>
          <Link href="/metodologia" className="hover:text-primary">Metodologia</Link>
        </nav>
      </main>
    </div>
  );
}
