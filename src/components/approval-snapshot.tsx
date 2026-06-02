import type { ApprovalAggregate } from "@/lib/approval-data";

const RATING_COLORS: Record<string, string> = {
  "Ótimo": "#16a34a",
  Bom: "#65a30d",
  Regular: "#ca8a04",
  Ruim: "#ea580c",
  "Péssimo": "#dc2626",
};

/**
 * Renderiza o agregado de avaliação de governo (binary + rating) ou um
 * empty-state quando ainda não há pesquisas indexadas. As duas métricas
 * aparecem lado a lado, cada uma agregada no seu próprio grupo comparável.
 */
export function ApprovalSnapshot({
  aggregate,
  emptyMessage,
}: {
  aggregate: ApprovalAggregate | null;
  emptyMessage?: string;
}) {
  if (!aggregate || (!aggregate.binary && !aggregate.rating)) {
    return (
      <div className="border border-dashed border-border rounded-sm bg-card p-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {emptyMessage ??
            "Nenhuma pesquisa de avaliação indexada ainda. Esta página é atualizada automaticamente assim que pesquisas de aprovação forem registradas no TSE e ingeridas pelo ElectioLab — sem números estimados ou simulados."}
        </p>
      </div>
    );
  }

  const dateBR = aggregate.latestDate
    ? new Date(aggregate.latestDate).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="space-y-6">
      {aggregate.binary && (
        <div className="border border-border rounded-sm bg-card overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-muted/30 text-xs font-mono text-muted-foreground">
            Aprova × Desaprova · média ponderada
          </div>
          <div className="p-4 space-y-3">
            {[aggregate.binary.aprova, aggregate.binary.desaprova].map((d, i) => (
              <div key={d.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{d.label}</span>
                  <span className="font-mono font-bold tabular-nums">{d.value.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, d.value)}%`,
                      backgroundColor: i === 0 ? "#16a34a" : "#dc2626",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {aggregate.rating && (
        <div className="border border-border rounded-sm bg-card overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-muted/30 flex flex-wrap justify-between gap-2 text-xs font-mono text-muted-foreground">
            <span>Avaliação ótimo → péssimo · média ponderada</span>
            {aggregate.ratingPositive != null && aggregate.ratingNegative != null && (
              <span>
                Positiva{" "}
                <strong className="text-foreground">{aggregate.ratingPositive.toFixed(1)}%</strong> ·
                Negativa{" "}
                <strong className="text-foreground">{aggregate.ratingNegative.toFixed(1)}%</strong>
              </span>
            )}
          </div>
          <div className="p-4 space-y-2.5">
            {aggregate.rating.map((d) => (
              <div key={d.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{d.label}</span>
                  <span className="font-mono tabular-nums">{d.value.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, d.value)}%`,
                      backgroundColor: RATING_COLORS[d.label] ?? "var(--primary)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground font-mono leading-relaxed">
        {aggregate.pollCount} pesquisa{aggregate.pollCount > 1 ? "s" : ""} ·{" "}
        {aggregate.institutes.length} instituto
        {aggregate.institutes.length > 1 ? "s" : ""}
        {dateBR ? ` · mais recente ${dateBR}` : ""} · ponderação por recência, amostra,
        método e acurácia do instituto
      </p>
    </div>
  );
}
