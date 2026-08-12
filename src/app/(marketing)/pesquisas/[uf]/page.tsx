'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';


interface AggregatedCandidate {
  name: string;
  weightedPercentage: number;
  confidence: number;
  samplesUsed: number;
}

interface AggregationResponse {
  candidates: AggregatedCandidate[];
  metadata: {
    aggregatedAt: string;
    totalSamplesProcessed: number;
    outliersRemoved: number;
    methodology: string;
  };
  error?: string;
}

const UF_NAMES: Record<string, string> = {
  SP: 'São Paulo',
  RJ: 'Rio de Janeiro',
  MG: 'Minas Gerais',
  BA: 'Bahia',
  RS: 'Rio Grande do Sul',
  PE: 'Pernambuco',
  CE: 'Ceará',
  PA: 'Pará',
  SC: 'Santa Catarina',
  GO: 'Goiás',
  PB: 'Paraíba',
  MA: 'Maranhão',
  ES: 'Espírito Santo',
  PI: 'Piauí',
  RN: 'Rio Grande do Norte',
  AL: 'Alagoas',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  DF: 'Distrito Federal',
  AC: 'Acre',
  AM: 'Amazonas',
  AP: 'Amapá',
  RO: 'Rondônia',
  RR: 'Roraima',
  TO: 'Tocantins',
};

export default function PesquisasPage() {
  const params = useParams();
  const uf = (params.uf as string)?.toUpperCase();

  const [days, setDays] = useState<number>(7);
  const [data, setData] = useState<AggregationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (selectedDays: number) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/polls/aggregated?uf=${uf}&days=${selectedDays}`,
        { next: { revalidate: 300 } }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar dados'
      );
    } finally {
      setLoading(false);
    }
  }, [uf]);

  useEffect(() => {
    if (uf && /^[A-Z]{2}$/.test(uf)) {
      fetchData(days);
    }
  }, [uf, days, fetchData]);

  if (!uf || !/^[A-Z]{2}$/.test(uf)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Estado não encontrado</h1>
          <p className="text-slate-300">Use o formato: /pesquisas-SP, /pesquisas-RJ, etc.</p>
        </div>
      </div>
    );
  }

  const stateName = UF_NAMES[uf] || uf;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Pesquisas Eleitorais - {stateName}
          </h1>
          <p className="text-slate-300">Agregação inteligente com ponderação de margem de erro e recência</p>
        </header>

        <div className="bg-slate-800 rounded-lg p-6 mb-8 border border-slate-700">
          <label className="block mb-4">
            <span className="text-white font-medium mb-2 block">Últimos dias:</span>
            <div className="flex gap-2">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-4 py-2 rounded font-medium transition ${
                    days === d
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </label>
        </div>

        {loading && (
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
            <div className="inline-block animate-spin">
              <div className="w-8 h-8 border-4 border-slate-600 border-t-blue-500 rounded-full"></div>
            </div>
            <p className="text-slate-300 mt-4">Carregando dados...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
            <p className="text-red-200">⚠️ {error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            {data.candidates.length > 0 ? (
              <div className="space-y-4 mb-8">
                {data.candidates.map((candidate, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-white">
                        {candidate.name}
                      </h3>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-400">
                          {candidate.weightedPercentage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-slate-400">
                          Confiança: {(candidate.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-slate-700 rounded-full h-2 mb-4 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full"
                        style={{ width: `${candidate.weightedPercentage}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-sm text-slate-400">
                      <span>Amostras: {candidate.samplesUsed}</span>
                      <span>Confiabilidade: {(candidate.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
                <p className="text-slate-300">Nenhuma pesquisa disponível para este período</p>
              </div>
            )}

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-sm text-slate-300">
              <details className="cursor-pointer group">
                <summary className="font-medium text-slate-200 hover:text-slate-100 cursor-pointer">
                  📊 Como funciona a agregação?
                </summary>
                <div className="mt-6 space-y-4 text-xs leading-relaxed">
                  <div>
                    <h4 className="font-semibold text-slate-100 mb-2">1️⃣ Precisão (Margem de Erro)</h4>
                    <p>Pesquisas mais precisas pesam mais na média:</p>
                    <ul className="ml-4 mt-1 space-y-1 text-slate-400">
                      <li>• MoE &lt; 2%: peso máximo (100%)</li>
                      <li>• MoE 2-3%: peso reduzido (~77%)</li>
                      <li>• MoE 5%: peso mínimo (~40%)</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-100 mb-2">2️⃣ Recência (Half-life 14 dias)</h4>
                    <p>Pesquisas recentes são mais relevantes:</p>
                    <ul className="ml-4 mt-1 space-y-1 text-slate-400">
                      <li>• Publicada hoje: peso 100%</li>
                      <li>• 7 dias atrás: peso 71%</li>
                      <li>• 14 dias atrás: peso 50%</li>
                      <li>• 28 dias atrás: peso 25%</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-100 mb-2">3️⃣ Outliers (2-Sigma)</h4>
                    <p>Dados anômalos (&gt;2σ desvios) são automaticamente descartados.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-100 mb-2">4️⃣ Confiança</h4>
                    <p>Baseada em intervalo de confiança de 95%:</p>
                    <ul className="ml-4 mt-1 space-y-1 text-slate-400">
                      <li>• ±0.5%: Confiança ~90% (alto consenso)</li>
                      <li>• ±2.5%: Confiança ~75% (consenso moderado)</li>
                      <li>• ±5%: Confiança ~50% (baixo consenso)</li>
                    </ul>
                  </div>

                  <hr className="border-slate-700 my-3" />

                  <div className="text-slate-400">
                    <p><strong>Fórmula:</strong> Σ(% × peso_precisão × peso_recência) / Σ(pesos)</p>
                    <p className="mt-2">
                      <strong>Amostras processadas:</strong> {data.metadata.totalSamplesProcessed} •
                      <strong className="ml-2">Outliers removidos:</strong> {data.metadata.outliersRemoved}
                    </p>
                    <p className="mt-2">
                      <strong>Atualizado em:</strong> {new Date(data.metadata.aggregatedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </details>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
