'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Gaffe {
  id: string;
  title: string;
  description: string;
  statement: string;
  date_event: string;
  source_name: string;
  source_url: string;
  status: 'reported' | 'verified' | 'disputed' | 'resolved' | 'retracted';
  category: string;
  fact_checked: boolean;
  fact_check_result?: string;
  created_at: string;
}

interface CandidateGaffesProps {
  candidateSlug: string;
  limit?: number;
  showTitle?: boolean;
}

const statusConfig = {
  reported: { icon: AlertCircle, label: 'Reportado', color: 'bg-yellow-100 text-yellow-800' },
  verified: { icon: CheckCircle2, label: 'Verificado', color: 'bg-blue-100 text-blue-800' },
  disputed: { icon: AlertCircle, label: 'Contestado', color: 'bg-orange-100 text-orange-800' },
  resolved: { icon: CheckCircle2, label: 'Resolvido', color: 'bg-green-100 text-green-800' },
  retracted: { icon: XCircle, label: 'Retratado', color: 'bg-red-100 text-red-800' },
};

const categoryConfig = {
  contradiction: { label: 'Contradição', color: 'bg-purple-100 text-purple-800' },
  controversial: { label: 'Controverso', color: 'bg-red-100 text-red-800' },
  false_statement: { label: 'Afirmação Falsa', color: 'bg-orange-100 text-orange-800' },
  legal_issue: { label: 'Questão Legal', color: 'bg-pink-100 text-pink-800' },
  ethical: { label: 'Questão Ética', color: 'bg-indigo-100 text-indigo-800' },
};

export function CandidateGaffes({
  candidateSlug,
  limit = 10,
  showTitle = true,
}: CandidateGaffesProps) {
  const [gaffes, setGaffes] = useState<Gaffe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGaffes = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // First get the candidate ID
        const { data: candidate, error: candidateError } = await supabase
          .from('candidates')
          .select('id')
          .eq('slug', candidateSlug)
          .single();

        if (candidateError || !candidate) {
          setError('Candidato não encontrado');
          setLoading(false);
          return;
        }

        // Then fetch gaffes
        const { data, error: gaffesError } = await supabase
          .from('candidate_gaffes')
          .select('*')
          .eq('candidate_id', candidate.id)
          .is('deleted_at', null)
          .order('date_event', { ascending: false })
          .limit(limit);

        if (gaffesError) {
          setError('Erro ao carregar gaffes');
          setLoading(false);
          return;
        }

        setGaffes(data || []);
      } catch (err) {
        setError('Erro inesperado');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGaffes();
  }, [candidateSlug, limit]);

  if (loading) {
    return (
      <div className="space-y-4">
        {showTitle && <h3 className="text-xl font-semibold">Declarações Controversas</h3>}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (gaffes.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Nenhuma gaffe registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <div>
          <h3 className="text-xl font-semibold">Declarações Controversas</h3>
          <p className="text-sm text-gray-600">
            {gaffes.length} {gaffes.length === 1 ? 'registro' : 'registros'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {gaffes.map((gaffe) => {
          const statusIcon = statusConfig[gaffe.status];
          const categoryInfo = categoryConfig[gaffe.category as keyof typeof categoryConfig];

          return (
            <div
              key={gaffe.id}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-gray-900 leading-tight flex-1">
                    {gaffe.title}
                  </h4>
                  <statusIcon.icon className="h-5 w-5 text-gray-600 flex-shrink-0 mt-1" />
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusIcon.color}>{statusIcon.label}</Badge>
                  {categoryInfo && (
                    <Badge className={categoryInfo.color}>{categoryInfo.label}</Badge>
                  )}
                  {gaffe.fact_checked && (
                    <Badge className="bg-green-100 text-green-800">✓ Verificado</Badge>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="mt-3 text-sm text-gray-700">{gaffe.description}</p>

              {/* Statement */}
              {gaffe.statement && (
                <div className="mt-3 rounded bg-gray-50 p-3 border-l-2 border-gray-300">
                  <p className="text-sm italic text-gray-600">"{gaffe.statement}"</p>
                </div>
              )}

              {/* Fact check result */}
              {gaffe.fact_check_result && (
                <div className="mt-2">
                  <span className="text-xs font-medium text-gray-600">Verificação: </span>
                  <span className="text-xs text-gray-600 capitalize">{gaffe.fact_check_result}</span>
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <div className="flex gap-4">
                  <span>{format(new Date(gaffe.date_event), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  <span>Fonte: {gaffe.source_name}</span>
                </div>
                {gaffe.source_url && (
                  <a
                    href={gaffe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Ver
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
