/**
 * Job Agendado: Sincroniza candidatos do TSE toda semana
 *
 * Execução: Toda segunda-feira às 10:00 UTC
 * Cadência: 1x por semana (7 dias)
 *
 * Uso:
 * 1. No servidor: npm run jobs:start
 * 2. Via API: POST /api/jobs/sync-candidatos
 */

import { createClient } from '@supabase/supabase-js';
import { divulgaCandContasClient } from '../tse/divulgacandcontas-client';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SyncCandidatosJobResult {
  success: boolean;
  startedAt: string;
  completedAt: string;
  totalCandidatos: number;
  totalErros: number;
  erros: string[];
  duration: number; // segundos
}

export async function syncCandidatosJob(ano: number = 2026): Promise<SyncCandidatosJobResult> {
  const startTime = Date.now();
  const startedAt = new Date().toISOString();

  console.log(`[JOB] Iniciando sincronização de candidatos - ${startedAt}`);

  const estados = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
    'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
  ];

  let totalCandidatos = 0;
  let totalErros = 0;
  const erros: string[] = [];

  // Buscar eleição de referência
  const { data: eleicoes, error: eleicaoError } = await sb
    .from('elections')
    .select('id, type, year')
    .eq('year', ano)
    .limit(1);

  if (eleicaoError || !eleicoes || eleicoes.length === 0) {
    const msg = `Nenhuma eleição encontrada para ${ano}`;
    console.error(`[JOB] ❌ ${msg}`);
    erros.push(msg);
    totalErros++;
    return {
      success: false,
      startedAt,
      completedAt: new Date().toISOString(),
      totalCandidatos: 0,
      totalErros,
      erros,
      duration: (Date.now() - startTime) / 1000,
    };
  }

  const electionId = eleicoes[0].id;
  console.log(`[JOB] 📍 Eleição encontrada: ${eleicoes[0].type} ${eleicoes[0].year}`);

  // Sincronizar Presidente
  try {
    console.log(`[JOB] 🔄 Sincronizando presidente...`);
    const candidatosPres = await divulgaCandContasClient.buscarCandidatos(
      ano,
      'SP', // Presidente é nacional, usa um estado qualquer
      'presidente'
    );

    if (candidatosPres && candidatosPres.length > 0) {
      const candidatosData = candidatosPres.map((c) => ({
        name: c.nome,
        full_name: c.nomeCompleto || c.nome,
        party: c.partido,
        number: c.numero ? parseInt(c.numero) : null,
        tse_id: c.sequencial || c.id,
        is_active: c.situacao === 'APTO',
        election_id: electionId,
      }));

      const { error: insertError } = await sb
        .from('candidates')
        .upsert(candidatosData, { onConflict: 'tse_id' });

      if (insertError) {
        throw new Error(insertError.message);
      }

      console.log(`[JOB] ✅ ${candidatosPres.length} presidentes sincronizados`);
      totalCandidatos += candidatosPres.length;
    }
  } catch (error) {
    const msg = `Erro ao sincronizar presidente: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(`[JOB] ❌ ${msg}`);
    erros.push(msg);
    totalErros++;
  }

  // Sincronizar Governadores
  for (const uf of estados) {
    try {
      console.log(`[JOB] 🔄 Sincronizando governador ${uf}...`);

      const candidatosGov = await divulgaCandContasClient.buscarCandidatos(
        ano,
        uf,
        'governador'
      );

      if (candidatosGov && candidatosGov.length > 0) {
        const candidatosData = candidatosGov.map((c) => ({
          name: c.nome,
          full_name: c.nomeCompleto || c.nome,
          party: c.partido,
          number: c.numero ? parseInt(c.numero) : null,
          tse_id: c.sequencial || c.id,
          is_active: c.situacao === 'APTO',
          election_id: electionId,
        }));

        const { error: insertError } = await sb
          .from('candidates')
          .upsert(candidatosData, { onConflict: 'tse_id' });

        if (insertError) {
          throw new Error(insertError.message);
        }

        console.log(`[JOB] ✅ ${candidatosGov.length} candidatos de ${uf} sincronizados`);
        totalCandidatos += candidatosGov.length;
      }
    } catch (error) {
      const msg = `Erro ao sincronizar governador ${uf}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      console.error(`[JOB] ❌ ${msg}`);
      erros.push(msg);
      totalErros++;
    }

    // Delay para não sobrecarregar TSE API
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const completedAt = new Date().toISOString();
  const duration = (Date.now() - startTime) / 1000;

  console.log(`[JOB] ✅ Job concluído em ${duration.toFixed(2)}s`);
  console.log(`[JOB] 📊 Total: ${totalCandidatos} candidatos, ${totalErros} erros`);

  // Registrar no audit
  await sb.from('data_source_audit').insert({
    source_type: 'tse_candidatos',
    ano,
    total_records: totalCandidatos,
    inserted_count: totalCandidatos,
    error_count: totalErros,
    errors: erros.length > 0 ? JSON.stringify(erros) : null,
    credibility_score: 9,
    refresh_interval_hours: 168, // 1 semana
    synced_at: new Date().toISOString(),
    next_sync_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return {
    success: totalErros === 0,
    startedAt,
    completedAt,
    totalCandidatos,
    totalErros,
    erros,
    duration,
  };
}
