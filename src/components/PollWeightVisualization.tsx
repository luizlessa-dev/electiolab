/**
 * Poll Weight Visualization Component
 *
 * Displays the 6 weight factors for each poll in the aggregation:
 * 1. Recency weight (exponential decay)
 * 2. Sample size weight (sqrt normalization)
 * 3. Methodology weight (presencial/mista/online)
 * 4. Institute credibility weight (0-10 scale with exponent 1.5)
 * 5. Margin of Error weight (MoE penalty)
 * 6. Outlier detection weight (>2σ threshold)
 *
 * Shows: Individual weights, combined weight, and contribution to final average
 */

'use client';

import React from 'react';

export interface WeightFactors {
  recency: number; // 0-1
  sampleSize: number; // typically 0.3-2.0
  methodology: number; // 0.6-1.0
  credibility: number; // 0.03-1.0
  marginOfError: number; // 0.36-1.5
  outlier: number; // 0.5 or 1.0
}

export interface PollWeightData {
  pollId: string;
  instituteName: string;
  percentage: number;
  sampleSize: number;
  methodology: 'presencial' | 'telefonica' | 'mista' | 'online';
  credibilityScore: number;
  marginOfError?: number;
  daysOld: number;
  isOutlier: boolean;
  factors: WeightFactors;
  finalWeight: number;
  contribution: number; // percentage × weight / total_weight
}

interface PollWeightVisualizationProps {
  polls: PollWeightData[];
  weightedAverage: number;
}

/**
 * Format a weight factor as percentage
 */
function formatWeight(weight: number): string {
  return `${(weight * 100).toFixed(1)}%`;
}

/**
 * Get color for weight magnitude
 */
function getWeightColor(weight: number): string {
  if (weight >= 0.8) return 'text-green-600'; // Good
  if (weight >= 0.5) return 'text-yellow-600'; // Medium
  if (weight >= 0.2) return 'text-orange-600'; // Low
  return 'text-red-600'; // Very low
}

/**
 * Weight factor card
 */
function WeightFactorCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2 bg-gray-50 rounded">
      <div className={`text-sm font-semibold ${getWeightColor(value)}`}>
        {formatWeight(value)}
      </div>
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  );
}

/**
 * Poll row with all weight factors
 */
function PollWeightRow({ poll }: { poll: PollWeightData }) {
  const finalWeightColor = getWeightColor(poll.finalWeight);

  return (
    <div className="border rounded-lg p-4 space-y-4 hover:bg-gray-50 transition">
      {/* Header: Institute name + percentage */}
      <div className="flex justify-between items-center">
        <div>
          <div className="font-semibold text-lg">{poll.instituteName}</div>
          <div className="text-sm text-gray-600">
            {poll.percentage.toFixed(1)}% (n={poll.sampleSize}, {poll.methodology})
          </div>
        </div>
        <div className={`text-2xl font-bold ${finalWeightColor}`}>
          {formatWeight(poll.finalWeight)}
        </div>
      </div>

      {/* Contribution to weighted average */}
      <div className="bg-blue-50 px-3 py-2 rounded text-sm">
        <div className="text-blue-900">
          📊 Contribui <strong>{poll.contribution.toFixed(1)}%</strong> para a média final
        </div>
      </div>

      {/* Weight factors grid */}
      <div className="grid grid-cols-3 gap-3">
        <WeightFactorCard
          label="Recência"
          value={poll.factors.recency}
          description={`${poll.daysOld}d: 0.5^(${poll.daysOld}/14)`}
        />
        <WeightFactorCard
          label="Amostra"
          value={poll.factors.sampleSize / 2} // normalize for display
          description={`√(${poll.sampleSize}/1000)`}
        />
        <WeightFactorCard
          label="Metodologia"
          value={poll.factors.methodology}
          description={poll.methodology}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <WeightFactorCard
          label="Credibilidade"
          value={poll.factors.credibility}
          description={`${poll.credibilityScore}/10: ${poll.factors.credibility.toFixed(3)}`}
        />
        <WeightFactorCard
          label="Margin of Error"
          value={poll.factors.marginOfError}
          description={
            poll.marginOfError ? `MoE: ${poll.marginOfError.toFixed(1)}%` : 'Não informado'
          }
        />
        <WeightFactorCard
          label="Outlier Detection"
          value={poll.factors.outlier}
          description={poll.isOutlier ? 'Z > 2σ: Downweighted' : 'Normal: Full weight'}
        />
      </div>

      {/* Final weight calculation */}
      <div className="bg-gray-100 px-3 py-2 rounded text-xs font-mono space-y-1">
        <div>
          <span className="text-gray-600">Peso Final = </span>
          {poll.factors.recency.toFixed(3)} × {(poll.factors.sampleSize / 2).toFixed(3)} ×{' '}
          {poll.factors.methodology.toFixed(3)} × {poll.factors.credibility.toFixed(3)} ×{' '}
          {poll.factors.marginOfError.toFixed(3)} × {poll.factors.outlier.toFixed(3)}
        </div>
        <div className={`font-semibold ${finalWeightColor}`}>
          = {poll.finalWeight.toFixed(4)}
        </div>
      </div>

      {/* Warnings/Notes */}
      {poll.isOutlier && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-800">
          ⚠️ Esta pesquisa foi detectada como outlier (>2σ) e teve seu peso reduzido a 50%.
        </div>
      )}
      {poll.daysOld > 21 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 text-sm text-yellow-800">
          📅 Esta pesquisa tem {poll.daysOld} dias. Peso decaiu para{' '}
          {formatWeight(poll.factors.recency)}.
        </div>
      )}
      {!poll.marginOfError && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 text-sm text-blue-800">
          ℹ️ Margin of Error não informado. MoE weight = 1.0 (sem penalização).
        </div>
      )}
    </div>
  );
}

/**
 * Main component: Poll Weight Visualization
 */
export function PollWeightVisualization({ polls, weightedAverage }: PollWeightVisualizationProps) {
  const totalWeight = polls.reduce((sum, p) => sum + p.finalWeight, 0);
  const maxWeight = Math.max(...polls.map(p => p.finalWeight));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 space-y-3">
        <h2 className="text-2xl font-bold text-gray-900">📊 Análise de Pesos - Fase 2</h2>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-3xl font-bold text-blue-600">{weightedAverage.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Média Ponderada</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">{polls.length}</div>
            <div className="text-sm text-gray-600">Pesquisas Analisadas</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600">
              {polls.filter(p => p.isOutlier).length}
            </div>
            <div className="text-sm text-gray-600">Outliers Detectados</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600">
              {(
                (polls.filter(p => p.finalWeight < 0.5).length / polls.length) *
                100
              ).toFixed(0)}
              %
            </div>
            <div className="text-sm text-gray-600">Downweighted</div>
          </div>
        </div>

        <div className="text-sm text-gray-700">
          💡 <strong>Fase 2</strong> aplica 6 fatores de peso independentes: recência,
          amostra, metodologia, credibilidade, margin of error e detecção de outliers.
        </div>
      </div>

      {/* Weight distribution */}
      <div className="bg-white rounded-lg p-4 border">
        <h3 className="font-semibold text-lg mb-3">📈 Distribuição de Pesos</h3>
        <div className="space-y-2">
          {polls
            .sort((a, b) => b.finalWeight - a.finalWeight)
            .map(poll => (
              <div key={poll.pollId} className="flex items-center gap-2">
                <div className="w-32 text-sm font-medium truncate">{poll.instituteName}</div>
                <div className="flex-1 bg-gray-200 rounded h-6 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all"
                    style={{ width: `${(poll.finalWeight / maxWeight) * 100}%` }}
                  />
                </div>
                <div className="w-16 text-right text-sm font-semibold">
                  {formatWeight(poll.finalWeight / totalWeight)}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Individual poll cards */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">🔍 Análise Detalhada por Pesquisa</h3>
        {polls
          .sort((a, b) => b.finalWeight - a.finalWeight)
          .map(poll => (
            <PollWeightRow key={poll.pollId} poll={poll} />
          ))}
      </div>

      {/* Explanation */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">📚 Como Funciona</h3>
        <ul className="text-sm space-y-2 text-gray-700 list-disc list-inside">
          <li>
            <strong>Recência:</strong> Pesquisas mais antigas têm menos peso (half-life de 14 dias)
          </li>
          <li>
            <strong>Amostra:</strong> Amostras maiores têm mais peso (normalização por √n)
          </li>
          <li>
            <strong>Metodologia:</strong> Presencial 1.0, Mista 0.85, Online 0.9, Telefonica 0.95
          </li>
          <li>
            <strong>Credibilidade:</strong> Instituto com credibilidade 9/10 tem 9.5x o peso de
            2/10
          </li>
          <li>
            <strong>MoE:</strong> Penaliza pesquisas com margem de erro grande (baseline 2.5%)
          </li>
          <li>
            <strong>Outlier:</strong> Valores >2σ da média são downweighted a 50%
          </li>
        </ul>
      </div>
    </div>
  );
}
