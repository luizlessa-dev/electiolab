'use client';

import { CandidateGaffes } from '@/components/CandidateGaffes';

export default function TestGaffesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Teste de Gaffes</h1>

        <div className="space-y-8">
          {/* Lula */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-2xl font-semibold mb-4">Lula</h2>
            <CandidateGaffes candidateSlug="lula" limit={10} showTitle={false} />
          </div>

          {/* Flávio */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-2xl font-semibold mb-4">Flávio Bolsonaro</h2>
            <CandidateGaffes candidateSlug="flavio-bolsonaro" limit={10} showTitle={false} />
          </div>
        </div>
      </div>
    </main>
  );
}
