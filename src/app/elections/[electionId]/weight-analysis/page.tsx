/**
 * Poll Weight Analysis Page
 *
 * Displays detailed weight analysis for all polls in an election
 * Shows all 6 factors: recency, sample size, methodology, credibility, MoE, outliers
 *
 * Route: /elections/[electionId]/weight-analysis
 */

'use client';

import React, { useEffect, useState } from 'react';
import { PollWeightVisualization, PollWeightData } from '@/components/PollWeightVisualization';

interface ElectionWeightData {
  electionId: string;
  electionName: string;
  weightedAverage: number;
  polls: PollWeightData[];
  lastUpdated: Date;
}

interface PageProps {
  params: Promise<{
    electionId: string;
  }>;
}

export default function WeightAnalysisPage({ params }: PageProps) {
  const [data, setData] = useState<ElectionWeightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeightData = async () => {
      try {
        setLoading(true);
        const { electionId } = await params;
        const response = await fetch(
          `/api/v1/elections/${electionId}/weight-analysis`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch weight data: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeightData();
  }, [params.electionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando análise de pesos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Erro ao Carregar</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-6 max-w-md text-center">
          <p className="text-gray-600">Nenhum dado disponível para esta eleição</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{data.electionName}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Análise Detalhada de Pesos - Fase 2
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600">
                {data.weightedAverage.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">Média Ponderada</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">{data.polls.length}</div>
              <p className="text-xs text-gray-600">Pesquisas</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">
                {data.polls.filter(p => p.finalWeight > 0.8).length}
              </div>
              <p className="text-xs text-gray-600">Peso Alto ({'>'}80%)</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-600">
                {data.polls.filter(p => p.isOutlier).length}
              </div>
              <p className="text-xs text-gray-600">Outliers</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600">Atualizado</div>
              <p className="text-sm font-semibold">
                {new Date(data.lastUpdated).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Useful Links */}
          <div className="mt-4 flex gap-2 text-sm">
            <a
              href={`/elections/${params.electionId}`}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← Voltar aos resultados
            </a>
            <span className="text-gray-400">•</span>
            <a
              href={`/elections/${params.electionId}/export?format=csv&include=weights`}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Exportar CSV
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <PollWeightVisualization polls={data.polls} weightedAverage={data.weightedAverage} />

        {/* Footer Info */}
        <div className="mt-12 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-lg mb-3">📚 Sobre esta Análise</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Fase 2 - Improvements</h4>
              <ul className="space-y-1 text-xs">
                <li>✅ Margin of Error weight (penaliza MoE grande)</li>
                <li>✅ Automatic outlier detection ({'>'}2σ downweight a 50%)</li>
                <li>✅ Increased recency half-life (10→14 dias)</li>
                <li>✅ Updated methodology weights (2026 standards)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Metodologia</h4>
              <p className="text-xs">
                Seis fatores independentes são combinados para gerar o peso final de cada
                pesquisa. Pesquisas recentes, de grande amostra, com boa credibilidade e MoE
                pequeno têm peso máximo. Outliers são detectados automaticamente e
                downweighted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
