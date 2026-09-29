import { useState, useCallback } from 'react';

export interface StateStats {
  sigla: string;
  nome: string;
  regiao: string;
  populacao: number;
  total_votos?: number;
  top_partido?: string;
  top_partido_pct?: number;
  color?: string;
  polls_count?: number;
}

export function useGeography() {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [stateData, setStateData] = useState<Record<string, StateStats>>({});
  const [loading, setLoading] = useState(false);

  const fetchStateData = useCallback(async (uf: string) => {
    if (stateData[uf]) return; // Cache local

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/geography/state/${uf}`);
      if (response.ok) {
        const data = await response.json();
        setStateData((prev) => ({ ...prev, [uf]: data }));
      }
    } catch (error) {
      console.error(`Erro ao buscar dados de ${uf}:`, error);
    } finally {
      setLoading(false);
    }
  }, [stateData]);

  const handleStateClick = useCallback(
    (uf: string) => {
      setSelectedState(uf);
      fetchStateData(uf);
    },
    [fetchStateData]
  );

  const handleStateHover = useCallback((uf: string | null) => {
    setHoveredState(uf);
    if (uf) {
      fetchStateData(uf);
    }
  }, [fetchStateData]);

  return {
    selectedState,
    setSelectedState,
    hoveredState,
    setHoveredState: handleStateHover,
    stateData,
    loading,
    handleStateClick,
  };
}
