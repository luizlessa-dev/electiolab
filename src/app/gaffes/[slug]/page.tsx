import { Metadata } from 'next';
import { CandidateGaffes } from '@/components/CandidateGaffes';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getCandidateInfo(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('candidates')
    .select('name, slug, party_id, party_name')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const candidate = await getCandidateInfo(resolvedParams.slug);

  if (!candidate) {
    return {
      title: 'Candidato não encontrado',
    };
  }

  return {
    title: `Gaffes de ${candidate.name} | ElectioLab`,
    description: `Declarações controversas e gaffes de ${candidate.name}`,
  };
}

export default async function GaffesPage({ params }: PageProps) {
  const resolvedParams = await params;
  const candidate = await getCandidateInfo(resolvedParams.slug);

  if (!candidate) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="space-y-4 mb-12">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{candidate.name}</h1>
              {candidate.party_name && (
                <p className="text-lg text-gray-600 mt-2">{candidate.party_name}</p>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-900">
              📰 Esta página lista declarações controversas e gaffes registradas durante a campanha.
              As informações são coletadas de fontes públicas como Poder360 e TSE.
            </p>
          </div>
        </div>

        {/* Gaffes Component */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <CandidateGaffes candidateSlug={params.slug} limit={50} showTitle={true} />
        </div>

        {/* Footer Info */}
        <div className="mt-12 rounded-lg bg-gray-50 p-6 text-sm text-gray-600 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Status das Gaffes</h3>
            <ul className="space-y-1 text-xs">
              <li>
                <span className="font-medium">Reportado:</span> Gaffe foi reportada mas não verificada
              </li>
              <li>
                <span className="font-medium">Verificado:</span> Informação foi checada por fact-checkers
              </li>
              <li>
                <span className="font-medium">Contestado:</span> Candidato ou assessoria contestou
              </li>
              <li>
                <span className="font-medium">Resolvido:</span> Questão foi esclarecida
              </li>
              <li>
                <span className="font-medium">Retratado:</span> Candidato se retratou da declaração
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Adicionar uma Gaffe</h3>
            <p>
              Para adicionar uma nova gaffe, edite o arquivo{' '}
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">scripts/ingest-gaffes-manual.ts</code>{' '}
              e rode:
            </p>
            <pre className="bg-gray-100 p-3 rounded mt-2 text-xs overflow-x-auto">
              npx tsx scripts/ingest-gaffes-manual.ts
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
