'use client';

import { useEffect, useState } from 'react';

interface StateFeature {
  type: 'Feature';
  properties: {
    nome: string;
    sigla: string;
    regiao: string;
    populacao: number;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

interface BrazilMapProps {
  selectedState: string | null;
  hoveredState: string | null;
  onStateClick: (uf: string) => void;
  onStateHover: (uf: string | null) => void;
  stateColors?: Record<string, string>;
}

export function BrazilMap({
  selectedState,
  hoveredState,
  onStateClick,
  onStateHover,
  stateColors = {},
}: BrazilMapProps) {
  const [features, setFeatures] = useState<StateFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGeoJSON = async () => {
      try {
        const response = await fetch('/geo/estados.geojson');
        const data = await response.json();
        setFeatures(data.features);
      } catch (error) {
        console.error('Erro ao carregar GeoJSON:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGeoJSON();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-96">
        <p className="text-muted-foreground">Carregando mapa...</p>
      </div>
    );
  }

  // Cálculo de bounds para ajustar SVG ao GeoJSON
  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;

  features.forEach((feature) => {
    if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates[0].forEach(([lng, lat]) => {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      });
    }
  });

  // Mercator Web projection simplificado
  const projectPoint = (lng: number, lat: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 800;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 600;
    return { x, y };
  };

  const pathFromCoordinates = (coords: number[][]) => {
    return coords
      .map((coord, i) => {
        const { x, y } = projectPoint(coord[0], coord[1]);
        return i === 0 ? `M${x},${y}` : `L${x},${y}`;
      })
      .join(' ');
  };

  // Cores por região (fallback)
  const regionColors: Record<string, string> = {
    'Norte': '#ef4444',
    'Nordeste': '#f59e0b',
    'Centro-Oeste': '#eab308',
    'Sudeste': '#3b82f6',
    'Sul': '#10b981',
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-card border border-border rounded-lg p-4">
      <svg viewBox="0 0 800 600" className="w-full max-w-2xl h-auto">
        {features.map((feature) => {
          if (feature.geometry.type !== 'Polygon') return null;

          const sigla = feature.properties.sigla;
          const isSelected = selectedState === sigla;
          const isHovered = hoveredState === sigla;
          const color =
            stateColors[sigla] ||
            regionColors[feature.properties.regiao] ||
            '#6b7280';

          const pathD = pathFromCoordinates(feature.geometry.coordinates[0]);

          // Calcular centroide para label
          const centerLng =
            feature.geometry.coordinates[0].reduce((sum, c) => sum + c[0], 0) /
            feature.geometry.coordinates[0].length;
          const centerLat =
            feature.geometry.coordinates[0].reduce((sum, c) => sum + c[1], 0) /
            feature.geometry.coordinates[0].length;
          const centerPoint = projectPoint(centerLng, centerLat);

          return (
            <g key={sigla}>
              <path
                d={pathD}
                fill={color}
                stroke="#1f2937"
                strokeWidth="1.5"
                opacity={isSelected ? 1 : isHovered ? 0.8 : 0.7}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                className="transition-all duration-200"
                onClick={() => onStateClick(sigla)}
                onMouseEnter={() => onStateHover(sigla)}
                onMouseLeave={() => onStateHover(null)}
              />
              {/* Label do estado */}
              <text
                x={centerPoint.x}
                y={centerPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-bold fill-white pointer-events-none"
              >
                {sigla}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
