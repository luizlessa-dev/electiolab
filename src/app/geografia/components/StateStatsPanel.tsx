'use client';

import type { StateStats } from '@/hooks/useGeography';

interface StateStatsPanelProps {
  state: StateStats | null;
  loading?: boolean;
}

export function StateStatsPanel({ state, loading }: StateStatsPanelProps) {
  if (!state) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p className="text-sm">Clique em um estado para ver detalhes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h2 className="text-2xl font-bold">{state.nome}</h2>
        <p className="text-sm text-muted-foreground">{state.regiao}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary p-3 rounded-lg">
          <p className="text-xs uppercase text-muted-foreground font-medium">População</p>
          <p className="text-lg font-bold mt-1">
            {(state.populacao / 1_000_000).toFixed(1)}M
          </p>
        </div>

        {state.total_votos && (
          <div className="bg-secondary p-3 rounded-lg">
            <p className="text-xs uppercase text-muted-foreground font-medium">Votos 2022</p>
            <p className="text-lg font-bold mt-1">
              {(state.total_votos / 1_000_000).toFixed(1)}M
            </p>
          </div>
        )}
      </div>

      {/* Top Partido */}
      {state.top_partido && (
        <div className="bg-secondary p-4 rounded-lg border border-border">
          <p className="text-xs uppercase text-muted-foreground font-medium mb-2">Líder 2022</p>
          <p className="text-lg font-bold">{state.top_partido}</p>
          <p className="text-2xl font-mono font-bold mt-1" style={{ color: state.color }}>
            {state.top_partido_pct?.toFixed(1)}%
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Carregando dados...
        </div>
      )}
    </div>
  );
}
