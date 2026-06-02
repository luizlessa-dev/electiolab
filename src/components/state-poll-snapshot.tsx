import Link from "next/link";
import type { StatePollSnapshot } from "@/lib/marketing-data";

/**
 * Renderiza a pesquisa mais recente (de qualquer eleição) como card.
 * Usado em /eleicoes-governador-{uf}-2026, /pesquisas-presidenciais-2026, etc.
 *
 * Se snapshot for null, mostra placeholder informativo.
 */
export function StatePollSnapshotCard({
  snapshot,
  emptyMessage = "Sem pesquisas indexadas para esta eleição. O ElectioLab atualiza assim que novas pesquisas forem registradas no TSE.",
}: {
  snapshot: StatePollSnapshot | null;
  emptyMessage?: string;
}) {
  if (!snapshot) {
    return (
      <div className="border border-border rounded-sm bg-card p-6">
        <p className="text-sm text-muted-foreground leading-relaxed">{emptyMessage}</p>
      </div>
    );
  }

  // Calcula maior pct para escala dos bars
  const maxPct = Math.max(...snapshot.results.map((r) => r.pct), 1);
  const pubDate = new Date(snapshot.publication_date);
  const dateBR = pubDate.toLocaleDateString("pt-BR");
  // Sinal de frescor para conteúdo YMYL eleitoral: pesquisa com >90 dias é
  // sinalizada visualmente (estados pequenos recebem poucas pesquisas).
  const daysSince = Math.floor((Date.now() - pubDate.getTime()) / 86_400_000);
  const isStale = daysSince > 90;

  const meta: string[] = [];
  if (snapshot.sample_size) meta.push(`${snapshot.sample_size.toLocaleString("pt-BR")} entrevistas`);
  if (snapshot.margin_of_error) meta.push(`±${snapshot.margin_of_error} pp`);
  if (snapshot.methodology) meta.push(snapshot.methodology);
  if (meta.length === 0 && snapshot.scope) meta.push(snapshot.scope);

  return (
    <div className="border border-border rounded-sm bg-card overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
        <span className="text-xs font-mono text-muted-foreground truncate">
          {snapshot.institute_name}
          {meta.length > 0 ? ` · ${meta.join(" · ")}` : ""}
        </span>
        <span
          className={`text-xs font-mono shrink-0 ${
            isStale ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
          }`}
        >
          {dateBR}
          {isStale ? ` · há ${daysSince} dias` : ""}
        </span>
      </div>
      {isStale && (
        <div className="px-4 py-2 border-b border-amber-500/20 bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
          Pesquisa com mais de 90 dias — poucos institutos cobrem esta eleição neste
          período. Novos dados aparecem automaticamente quando publicados.
        </div>
      )}
      <div className="divide-y divide-border">
        {snapshot.results.map((c, i) => (
          <div key={`${c.name}-${i}`} className="px-4 py-3 flex items-center gap-4">
            <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.party ?? "—"}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32 hidden sm:block">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(c.pct / maxPct) * 100}%`,
                      backgroundColor: c.color ?? "var(--primary)",
                    }}
                  />
                </div>
              </div>
              <span
                className="text-sm font-mono font-bold tabular-nums w-12 text-right"
                style={{ color: c.color ?? undefined }}
              >
                {c.pct.toFixed(1).replace(/\.0$/, "")}%
              </span>
            </div>
          </div>
        ))}
      </div>
      {snapshot.scenario_label && (
        <div className="px-4 py-2 border-t border-border bg-muted/20 text-[10px] font-mono text-muted-foreground">
          Cenário: {snapshot.scenario_label}
        </div>
      )}
      <div className="px-4 py-2 border-t border-border bg-muted/20 text-[10px] font-mono text-muted-foreground leading-relaxed">
        O ElectioLab pondera pesquisas por recência, amostra, método e acurácia histórica
        do instituto.{" "}
        <Link href="/metodologia" className="text-primary hover:underline">
          Ver metodologia
        </Link>
      </div>
    </div>
  );
}
