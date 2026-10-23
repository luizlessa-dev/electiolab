import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import {
  UFS_SEGUNDO_TURNO,
  diasParaSegundoTurno,
  getPresidenteSegundoTurno,
  getResultadosGovernador1T,
} from "@/lib/segundo-turno";

/** Nome curto p/ chip: sem título; nome inteiro se couber, senão o último sobrenome. */
function curto(nome: string): string {
  const n = nome.replace(/^(Professora?|Dr\.?|Dra\.?)\s+/i, "");
  return n.length <= 14 ? n : n.split(" ").slice(-1)[0];
}

/** Faixa de destaque do topo da home: 2º turno de 25/10 (presidente + 7 governos). */
export async function SegundoTurnoHomeDestaque() {
  const [pres, res] = await Promise.all([getPresidenteSegundoTurno(), getResultadosGovernador1T()]);
  const dias = diasParaSegundoTurno();
  if (dias === 0 && !pres.primeiroTurno) return null;

  return (
    <section className="px-4 py-6 border-b border-border bg-gradient-to-b from-primary/10 to-transparent">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-mono uppercase tracking-wider text-primary flex items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5" />
            2º turno · 25 de outubro
            {dias > 0 && <span className="text-muted-foreground">· faltam {dias} {dias === 1 ? "dia" : "dias"}</span>}
          </p>
          <Link href="/segundo-turno" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
            Todas as pesquisas do 2º turno <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Link
            href="/quem-vence-no-segundo-turno-presidencia-2026"
            className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors"
          >
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Presidente</p>
            <p className="mt-1 text-lg font-bold tracking-tight">Lula × Flávio Bolsonaro</p>
            {pres.primeiroTurno && (
              <p className="text-sm text-muted-foreground mt-0.5 font-mono tabular-nums">
                1º turno: {pres.primeiroTurno.lula.toFixed(1)}% × {pres.primeiroTurno.flavio.toFixed(1)}%
              </p>
            )}
          </Link>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Governador · 7 estados
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {UFS_SEGUNDO_TURNO.map((uf) => {
                const t = res[uf]?.top ?? [];
                return (
                  <Link
                    key={uf}
                    href={`/segundo-turno/${uf}`}
                    className="rounded-sm border border-border px-2.5 py-1.5 text-xs hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <span className="font-mono font-bold uppercase">{uf}</span>
                    {t.length === 2 && (
                      <span className="text-muted-foreground"> · {curto(t[0].nome)} × {curto(t[1].nome)}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
