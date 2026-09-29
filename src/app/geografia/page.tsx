'use client';

import { useGeography } from '@/hooks/useGeography';
import { BrazilMap } from './components/BrazilMap';
import { StateStatsPanel } from './components/StateStatsPanel';

export default function GeografiaPage() {
  const { selectedState, hoveredState, stateData, loading, handleStateClick, setHoveredState } =
    useGeography();

  const selectedStateData = selectedState ? stateData[selectedState] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">Mapa Político do Brasil</h1>
        <p className="text-muted-foreground">Explore candidatos, votos e força política por estado</p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 p-6">
        {/* Mapa */}
        <div>
          <BrazilMap
            selectedState={selectedState}
            hoveredState={hoveredState}
            onStateClick={handleStateClick}
            onStateHover={setHoveredState}
          />
        </div>

        {/* Painel Lateral */}
        <div className="lg:border lg:border-border lg:rounded-lg lg:p-4">
          <StateStatsPanel state={selectedStateData} loading={loading} />
        </div>
      </div>
    </div>
  );
}
