import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Poll {
  id: string;
  institute_name: string;
  scope: string;
  source_kind: string;
  publication_date: string;
  results: Array<{ name: string; pct: number }>;
  margin_of_error?: number;
  lower_bound?: number;
  upper_bound?: number;
}

export function DeputadoFederalPolls({ state }: { state: string }) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolls = async () => {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );

      const { data } = await sb
        .from('poll_drafts')
        .select('*')
        .eq('scope', state)
        .in('source_kind', ['tier1-manual', 'simulated', 'tier2-presidencial'])
        .order('publication_date', { ascending: false });

      setPolls(data || []);
      setLoading(false);
    };

    fetchPolls();
  }, [state]);

  if (loading) return <div>Carregando...</div>;

  const tier1 = polls.filter(p => p.source_kind === 'tier1-manual');
  const simulated = polls.filter(p => p.source_kind === 'simulated');
  const presidential = polls.filter(p => p.source_kind === 'tier2-presidencial');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Deputado Federal — {state}</h2>

      {/* Pesquisas Reais */}
      {tier1.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-green-600">✓ Pesquisas Reais</h3>
          <div className="space-y-2">
            {tier1.map(poll => (
              <div key={poll.id} className="border border-green-200 bg-green-50 p-4 rounded">
                <div className="font-semibold">{poll.institute_name}</div>
                <div className="text-sm text-gray-600">{poll.publication_date}</div>
                <div className="mt-2 space-y-1">
                  {poll.results?.map((r: any, i: number) => (
                    <div key={i} className="text-sm">
                      {r.name}: <strong>{r.pct}%</strong>
                      {poll.margin_of_error && <span className="ml-2 text-gray-500">±{poll.margin_of_error.toFixed(2)}%</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Estimativas */}
      {simulated.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-blue-600">~ Estimativas Bayesianas</h3>
          <p className="text-sm text-gray-600 mb-3">Baseado em pesquisa presidencial com intervalo de confiança 95%</p>
          <div className="space-y-2">
            {simulated.map(poll => (
              <div key={poll.id} className="border border-blue-200 bg-blue-50 p-4 rounded">
                <div className="font-semibold">{poll.results?.[0]?.name}</div>
                <div className="text-sm text-gray-600">{poll.publication_date}</div>
                <div className="mt-2 space-y-1">
                  {poll.results?.map((r: any, i: number) => (
                    <div key={i} className="text-sm">
                      {r.name}: <strong>{r.pct?.toFixed(1)}%</strong>
                      <span className="ml-2 text-gray-500">
                        (intervalo de confiança: ~±5pp)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pesquisas Presidenciais de Referência */}
      {presidential.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-purple-600">📊 Presidencial (Referência)</h3>
          <div className="space-y-2">
            {presidential.map(poll => (
              <div key={poll.id} className="border border-purple-200 bg-purple-50 p-4 rounded text-sm">
                <div className="font-semibold">{poll.institute_name}</div>
                <div className="text-gray-600">{poll.publication_date}</div>
                <div className="mt-2">
                  {poll.results?.map((r: any, i: number) => (
                    <div key={i}>{r.name}: {r.pct}%</div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  (Estimativas de deputado foram calculadas a partir desta pesquisa)
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {polls.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Sem dados de pesquisa para {state}
        </div>
      )}
    </div>
  );
}
