/**
 * API Endpoint: POST /api/recalculate-averages
 *
 * Recalcula as médias ponderadas com todos os 6 weight factors (Fase 2)
 * Query params:
 *   - all=true: recalcula todas as eleições
 *   - election_id=uuid: recalcula eleição específica
 *   - keep_history=true: mantém histórico anterior
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database.types';

const RECENCY_HALF_LIFE_DAYS = 14;
const BASELINE_MOE = 2.5;

type WeightedAverageInsert = Database['public']['Tables']['weighted_averages']['Insert'];

interface PollResultJoin {
  candidate_id: string;
  percentage: number;
}

interface InstituteJoin {
  id: string;
  name: string;
  reliability_score: number | null;
}

interface PollWithJoins {
  id: string;
  fieldwork_end: string;
  sample_size: number;
  methodology: string | null;
  margin_of_error: number | null;
  institute_id: string;
  institutes: InstituteJoin | null;
  poll_results: PollResultJoin[] | null;
}

function getRecencyWeight(daysOld: number): number {
  return Math.pow(0.5, daysOld / RECENCY_HALF_LIFE_DAYS);
}

function getSampleSizeWeight(sampleSize: number): number {
  return Math.sqrt(sampleSize / 1000);
}

function getMethodologyWeight(methodology: string | null): number {
  const weights: Record<string, number> = {
    presencial: 1.0,
    telefonica: 0.95,
    mista: 0.85,
    online: 0.9,
  };
  return weights[methodology?.toLowerCase() ?? ''] || 0.5;
}

function getCredibilityWeight(score?: number): number {
  const credScore = Math.max(0, Math.min(10, score ?? 5));
  return Math.pow(credScore / 10, 1.5);
}

function getMoEWeight(moe?: number | null): number {
  if (!moe || moe <= 0) return 1.0;
  return Math.min(1.5, BASELINE_MOE / Math.max(0.5, moe));
}

function getOutlierWeight(percentage: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 1.0;
  const zscore = Math.abs(percentage - mean) / stdDev;
  return zscore > 2 ? 0.5 : 1.0;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const allFlag = searchParams.get('all') === 'true';
    const electionId = searchParams.get('election_id');
    const keepHistory = searchParams.get('keep_history') === 'true';

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const electionsToProcess: string[] = [];

    if (allFlag) {
      // Get all elections with polls
      const { data: elections, error: pollsError } = await supabase
        .from('polls')
        .select('election_id');

      console.log('Polls query:', { count: elections?.length, error: pollsError?.message });

      const uniqIds = Array.from(
        new Set((elections ?? []).map((p) => p.election_id).filter(Boolean))
      );
      console.log('Unique elections:', uniqIds.length);
      electionsToProcess.push(...uniqIds);
    } else if (electionId) {
      electionsToProcess.push(electionId);
    } else {
      return NextResponse.json(
        { error: 'election_id or all=true required' },
        { status: 400 }
      );
    }

    console.log('Elections to process:', electionsToProcess.length);
    const results = [];

    for (const eId of electionsToProcess) {
      try {
        const { data: election, error: eError } = await supabase
          .from('elections')
          .select('id, name')
          .eq('id', eId)
          .single();

        console.log(`Election ${eId}:`, { found: !!election, error: eError?.message });

        if (!election) continue;

        const { data: candidates, error: cError } = await supabase
          .from('candidates')
          .select('id, name')
          .eq('election_id', eId)
          .eq('is_active', true);

        console.log(`  Candidates for ${eId}:`, { count: candidates?.length || 0, error: cError?.message });

        if (!candidates?.length) continue;

        const { data: polls, error: pError } = await supabase
          .from('polls')
          .select(`
            id,
            fieldwork_end,
            sample_size,
            methodology,
            margin_of_error,
            institute_id,
            institutes(id, name, reliability_score),
            poll_results(candidate_id, percentage)
          `)
          .eq('election_id', eId)
          .order('fieldwork_end', { ascending: false })
          .returns<PollWithJoins[]>();

        console.log(`  Polls for ${eId}:`, { count: polls?.length || 0, error: pError?.message });

        if (!polls?.length) continue;

        const referenceDate = new Date();

        // Clear old if not keeping history
        if (!keepHistory) {
          await supabase
            .from('weighted_averages')
            .delete()
            .eq('election_id', eId);
        }

        const rows: WeightedAverageInsert[] = [];

        for (const candidate of candidates) {
          const candidatePolls = polls.filter((p) =>
            p.poll_results?.some((r) => r.candidate_id === candidate.id)
          );

          if (!candidatePolls.length) continue;

          // Calculate rough average for outlier detection
          const percentages = candidatePolls
            .flatMap((p) => p.poll_results || [])
            .filter((r) => r.candidate_id === candidate.id)
            .map((r) => r.percentage);

          const roughAvg =
            percentages.length > 0
              ? percentages.reduce((a: number, b: number) => a + b, 0) / percentages.length
              : 0;

          const roughStdDev =
            percentages.length > 0
              ? Math.sqrt(
                  percentages.reduce((sum: number, p: number) => sum + Math.pow(p - roughAvg, 2), 0) /
                    percentages.length
                )
              : 1;

          // Calculate weighted average
          let weightedSum = 0;
          let totalWeight = 0;
          let totalSampleSize = 0;
          let pollCount = 0;

          for (const poll of candidatePolls) {
            const result = poll.poll_results?.find((r) => r.candidate_id === candidate.id);
            if (!result) continue;

            const daysOld = Math.max(
              0,
              (referenceDate.getTime() - new Date(poll.fieldwork_end).getTime()) / 86400000
            );

            const rWeight = getRecencyWeight(daysOld);
            const sWeight = getSampleSizeWeight(poll.sample_size);
            const mWeight = getMethodologyWeight(poll.methodology);
            const institute = poll.institutes;
            const credibilityScore = institute?.reliability_score ? (institute.reliability_score * 10) : 5;
            const iWeight = getCredibilityWeight(credibilityScore);
            const moeWeight = getMoEWeight(poll.margin_of_error);
            const outlierWeight = getOutlierWeight(result.percentage, roughAvg, roughStdDev);

            const finalWeight = rWeight * sWeight * mWeight * iWeight * moeWeight * outlierWeight;

            weightedSum += result.percentage * finalWeight;
            totalWeight += finalWeight;
            totalSampleSize += poll.sample_size;
            pollCount++;
          }

          if (totalWeight === 0) continue;

          const average = weightedSum / totalWeight;

          // Calculate weighted std dev
          let varianceSum = 0;
          for (const poll of candidatePolls) {
            const result = poll.poll_results?.find((r) => r.candidate_id === candidate.id);
            if (!result) continue;

            const daysOld = Math.max(
              0,
              (referenceDate.getTime() - new Date(poll.fieldwork_end).getTime()) / 86400000
            );

            const rWeight = getRecencyWeight(daysOld);
            const sWeight = getSampleSizeWeight(poll.sample_size);
            const mWeight = getMethodologyWeight(poll.methodology);
            const institute = poll.institutes;
            const credibilityScore = institute?.reliability_score ? (institute.reliability_score * 10) : 5;
            const iWeight = getCredibilityWeight(credibilityScore);
            const moeWeight = getMoEWeight(poll.margin_of_error);
            const outlierWeight = getOutlierWeight(result.percentage, roughAvg, roughStdDev);
            const finalWeight = rWeight * sWeight * mWeight * iWeight * moeWeight * outlierWeight;

            varianceSum += finalWeight * Math.pow(result.percentage - average, 2);
          }

          const stdDev = Math.sqrt(varianceSum / totalWeight);

          rows.push({
            election_id: eId,
            candidate_id: candidate.id,
            scenario_label: null,
            weighted_average: Math.round(average * 10) / 10,
            confidence_interval_low: Math.max(0, Math.round((average - 1.96 * stdDev) * 10) / 10),
            confidence_interval_high: Math.min(100, Math.round((average + 1.96 * stdDev) * 10) / 10),
            polls_included: pollCount,
            total_sample_size: totalSampleSize,
            calculated_at: new Date().toISOString(),
            calculation_params: {
              half_life: RECENCY_HALF_LIFE_DAYS,
              reference_date: referenceDate.toISOString(),
            },
          });
        }

        if (rows.length > 0) {
          const { error: insErr } = await supabase
            .from('weighted_averages')
            .insert(rows);

          if (insErr) throw insErr;
        }

        results.push({
          election_id: eId,
          election_name: election.name,
          candidates_updated: rows.length,
          success: true,
        });
      } catch (error) {
        console.error(`Error processing election ${eId}:`, error);
        results.push({
          election_id: eId,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        });
      }
    }

    return NextResponse.json({
      success: results.every((r) => r.success),
      elections_processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Recalculate averages error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
