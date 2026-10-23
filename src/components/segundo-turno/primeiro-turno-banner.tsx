import Link from "next/link";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { getResultadosGovernador1T, isUfSegundoTurno, UF_NOME } from "@/lib/segundo-turno";

/**
 * Aviso no topo das páginas `eleicoes-governador-XX-2026`: o conteúdo dessas páginas
 * foi escrito para a corrida aberta; depois de 04/10 a primeira informação é o
 * resultado oficial. UF com 2º turno → chama para o confronto; UF decidida → eleito.
 */
export async function PrimeiroTurnoBanner({ uf }: { uf: string }) {
  const key = uf.toLowerCase();
  const res = (await getResultadosGovernador1T())[key];
  if (!res || res.top.length === 0) return null;

  if (isUfSegundoTurno(key)) {
    const [a, b] = res.top;
    return (
      <Link
        href={`/segundo-turno/${key}`}
        className="block rounded-lg border border-warning/40 bg-warning/10 p-4 hover:bg-warning/15 transition-colors"
      >
        <p className="text-xs font-mono uppercase tracking-wider text-warning flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5" /> 2º turno em 25/10 · {UF_NOME[key]}
        </p>
        <p className="mt-1 text-base font-semibold">
          {a.nome} ({a.partido}) × {b.nome} ({b.partido})
        </p>
        <p className="text-sm text-muted-foreground">
          1º turno: {a.pct.toFixed(1)}% × {b.pct.toFixed(1)}%. Ver pesquisas do 2º turno →
        </p>
      </Link>
    );
  }

  if (res.situacao === "eleito") {
    const a = res.top[0];
    return (
      <div className="rounded-lg border border-positive/40 bg-positive/10 p-4">
        <p className="text-xs font-mono uppercase tracking-wider text-positive flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" /> Governador eleito no 1º turno · 04/10/2026
        </p>
        <p className="mt-1 text-base font-semibold">
          {a.nome} ({a.partido}) com {a.pct.toFixed(1)}% dos votos válidos
        </p>
        <p className="text-sm text-muted-foreground">
          Esta página guarda o histórico das pesquisas da disputa. O foco agora é o{" "}
          <Link href="/segundo-turno" className="underline underline-offset-2">2º turno de 25/10</Link>.
        </p>
      </div>
    );
  }
  return null;
}
