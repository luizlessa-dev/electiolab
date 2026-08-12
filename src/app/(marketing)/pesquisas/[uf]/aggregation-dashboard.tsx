'use client';

/**
 * State Aggregation Dashboard Component
 *
 * Displays weighted aggregated polls with:
 * - Quality metrics
 * - Confidence scoring
 * - Baseline comparison
 * - Anomaly alerts
 */

import React, { useState, useEffect } from 'react';

interface AggregatedCandidate {
  name: string;
  party?: string;
  weightedPercentage: number;
  confidence: number;
  samplesUsed: number;
  researchPercentage?: number;
}

interface QualityMetrics {
  dataQualityScore: number;
  coverageScore: number;
  conflictScore: number;
}

interface AggregationResult {
  state: string;
  position: string;
  aggregation: {
    candidates: AggregatedCandidate[];
    qualityMetrics: QualityMetrics;
    validatedPolls: number;
    invalidPolls: number;
  };
  baseline: {
    comparison: Array<{
      candidateName: string;
      researchPercentage: number;
      aggregatedPercentage: number;
      deviation: number;
      isSignificant: boolean;
    }>;
    anomalyDetection: {
      anomalyCount: number;
    };
  };
}

interface AggregationDashboardProps {
  uf: string;
  position?: 'governador' | 'senador';
  days?: number;
}

export function AggregationDashboard({
  uf,
  position = 'governador',
  days = 30,
}: AggregationDashboardProps) {
  const [data, setData] = useState<AggregationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'aggregation' | 'quality' | 'baseline'>('aggregation');

  useEffect(() => {
    const fetchAggregation = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/polls/aggregated?uf=${uf}&position=${position}&days=${days}`
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load aggregation');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAggregation();
  }, [uf, position, days]);

  if (loading) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold">Error loading aggregation</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { aggregation, baseline } = data;
  const { candidates, qualityMetrics, validatedPolls, invalidPolls } = aggregation;

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-blue-600';
    if (confidence >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-100';
    if (score >= 0.6) return 'bg-blue-100';
    if (score >= 0.4) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getAnomalySeverity = (deviation: number): string => {
    if (Math.abs(deviation) >= 10) return 'text-red-600 font-semibold';
    if (Math.abs(deviation) >= 7) return 'text-orange-600 font-semibold';
    if (Math.abs(deviation) >= 5) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg">
        <h2 className="text-3xl font-bold mb-2">
          {uf} - Pesquisa Agregada ({position === 'governador' ? 'Governador' : 'Senador'})
        </h2>
        <p className="text-blue-100">
          Últimos {days} dias • {validatedPolls} pesquisas validadas
          {invalidPolls > 0 && ` • ${invalidPolls} rejeitadas`}
        </p>
      </div>

      {/* Anomaly Alert */}
      {baseline.anomalyDetection.anomalyCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-2xl mr-3">⚠️</div>
            <div>
              <h4 className="font-semibold text-yellow-800">
                {baseline.anomalyDetection.anomalyCount} anomalia{baseline.anomalyDetection.anomalyCount !== 1 ? 's' : ''} detectada{baseline.anomalyDetection.anomalyCount !== 1 ? 's' : ''}
              </h4>
              <p className="text-yellow-700 text-sm mt-1">
                Desvios significativos em relação à pesquisa base foram encontrados
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('aggregation')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'aggregation'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Agregação
        </button>
        <button
          onClick={() => setActiveTab('quality')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'quality'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Qualidade
        </button>
        <button
          onClick={() => setActiveTab('baseline')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'baseline'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Baseline
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {activeTab === 'aggregation' && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Resultados Agregados</h3>
            {candidates.length === 0 ? (
              <p className="text-gray-500">Nenhum candidato com dados</p>
            ) : (
              candidates.map((candidate, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{candidate.name}</h4>
                      {candidate.party && (
                        <p className="text-sm text-gray-600">{candidate.party}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">
                        {candidate.weightedPercentage.toFixed(1)}%
                      </div>
                      <div className={`text-sm font-medium ${getConfidenceColor(candidate.confidence)}`}>
                        Confiança: {(candidate.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${candidate.weightedPercentage}%` }}
                    />
                  </div>

                  {/* Metadata */}
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{candidate.samplesUsed} pesquisas</span>
                    {candidate.researchPercentage && (
                      <span>Pesquisa base: {candidate.researchPercentage}%</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Métricas de Qualidade</h3>

            {/* Data Quality */}
            <div className={`rounded-lg p-4 ${getQualityColor(qualityMetrics.dataQualityScore)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800">Qualidade dos Dados</h4>
                  <p className="text-sm text-gray-600">
                    Percentual de polls validados vs rejeitados
                  </p>
                </div>
                <div className="text-3xl font-bold text-gray-800">
                  {(qualityMetrics.dataQualityScore * 100).toFixed(0)}%
                </div>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-2 mt-3">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${qualityMetrics.dataQualityScore * 100}%` }}
                />
              </div>
            </div>

            {/* Coverage */}
            <div className={`rounded-lg p-4 ${getQualityColor(qualityMetrics.coverageScore)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800">Cobertura de Candidatos</h4>
                  <p className="text-sm text-gray-600">
                    % de candidatos com dados de pesquisa
                  </p>
                </div>
                <div className="text-3xl font-bold text-gray-800">
                  {(qualityMetrics.coverageScore * 100).toFixed(0)}%
                </div>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-2 mt-3">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${qualityMetrics.coverageScore * 100}%` }}
                />
              </div>
            </div>

            {/* Conflict */}
            <div className={`rounded-lg p-4 ${getQualityColor(1 - qualityMetrics.conflictScore)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800">Concordância entre Institutos</h4>
                  <p className="text-sm text-gray-600">
                    Baixo conflito = alta consonância
                  </p>
                </div>
                <div className="text-3xl font-bold text-gray-800">
                  {(qualityMetrics.conflictScore * 100).toFixed(0)}%
                </div>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-2 mt-3">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{ width: `${qualityMetrics.conflictScore * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'baseline' && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Comparação com Pesquisa Base</h3>

            {baseline.comparison.length === 0 ? (
              <p className="text-gray-500">Nenhuma comparação disponível</p>
            ) : (
              <div className="space-y-3">
                {baseline.comparison.map((item, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{item.candidateName}</h4>
                      <div className={`text-sm font-bold ${getAnomalySeverity(item.deviation)}`}>
                        {item.deviation > 0 ? '+' : ''}{item.deviation.toFixed(1)}%
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Pesquisa:</span>
                        <span className="ml-2 font-semibold">{item.researchPercentage}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Agregado:</span>
                        <span className="ml-2 font-semibold">{item.aggregatedPercentage.toFixed(1)}%</span>
                      </div>
                    </div>

                    {item.isSignificant && (
                      <div className="mt-2 text-xs text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        Desvio significativo detectado
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center py-4 border-t border-gray-200">
        Atualizado em {new Date().toLocaleString('pt-BR')}
      </div>
    </div>
  );
}
