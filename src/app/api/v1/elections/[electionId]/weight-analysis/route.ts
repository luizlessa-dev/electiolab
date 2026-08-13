/**
 * API Endpoint: GET /api/v1/elections/[electionId]/weight-analysis
 *
 * Returns detailed weight analysis for all polls in an election
 * Calculates all 6 weight factors for visualization
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database.types';

type PollForWeight = Pick<
  Database['public']['Tables']['polls']['Row'],
  'id' | 'publication_date' | 'fieldwork_end' | 'sample_size' | 'methodology' | 'margin_of_error'
> & {
  institutes: Pick<
    Database['public']['Tables']['institutes']['Row'],
    'id' | 'name' | 'reliability_score'
  > | null;
  poll_results: Pick<
    Database['public']['Tables']['poll_results']['Row'],
    'candidate_id' | 'percentage'
  >[];
};

const RECENCY_HALF_LIFE_DAYS = 14;
const BASELINE_MOE = 2.5;

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ electionId: string }> }
) {
  try {
    const { electionId } = await params;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch election and polls
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('id, name')
      .eq('id', electionId)
      .single();

    if (electionError || !election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    // 2. Fetch polls with results
    const { data: polls, error: pollsError } = await supabase
      .from('polls')
      .select(`
        id,
        publication_date,
        fieldwork_end,
        sample_size,
        methodology,
        margin_of_error,
        institutes(id, name, reliability_score),
        poll_results(
          candidate_id,
          percentage
        )
      `)
      .eq('election_id', electionId)
      .order('fieldwork_end', { ascending: false })
      .returns<PollForWeight[]>();

    if (pollsError || !polls) {
      return NextResponse.json(
        { error: 'Failed to fetch polls' },
        { status: 500 }
      );
    }

    // 3. Calculate weights for each poll
    const referenceDate = new Date();
    const pollWeights = [];

    for (const poll of polls) {
      const daysOld = Math.max(
        0,
        (referenceDate.getTime() - new Date(poll.fieldwork_end).getTime()) / 86400000
      );

      // Calculate factors
      const rWeight = getRecencyWeight(daysOld);
      const sWeight = getSampleSizeWeight(poll.sample_size);
      const mWeight = getMethodologyWeight(poll.methodology);
      const institute = poll.institutes;
      const credibilityScore = institute?.reliability_score ? (institute.reliability_score * 10) : 5;
      const iWeight = getCredibilityWeight(credibilityScore);
      const moeWeight = getMoEWeight(poll.margin_of_error);

      // Calculate rough average for outlier detection
      const percentages = poll.poll_results?.map((r) => r.percentage) || [];
      const roughAvg =
        percentages.length > 0 ? percentages.reduce((a: number, b: number) => a + b, 0) / percentages.length : 0;
      const roughStdDev =
        percentages.length > 0
          ? Math.sqrt(
              percentages.reduce((sum: number, p: number) => sum + Math.pow(p - roughAvg, 2), 0) /
                percentages.length
            )
          : 1;

      // For each candidate result
      for (const result of poll.poll_results || []) {
        const outlierWeight = getOutlierWeight(result.percentage, roughAvg, roughStdDev);
        const finalWeight = rWeight * sWeight * mWeight * iWeight * moeWeight * outlierWeight;

        const institute = poll.institutes;
        const instName = institute?.name || 'Unknown';
        const credScore = institute?.reliability_score ? (institute.reliability_score * 10) : 5;

        pollWeights.push({
          pollId: `${poll.id}-${result.candidate_id}`,
          instituteName: instName,
          percentage: result.percentage,
          sampleSize: poll.sample_size,
          methodology: poll.methodology,
          credibilityScore: credScore,
          marginOfError: poll.margin_of_error,
          daysOld: Math.round(daysOld),
          isOutlier: Math.abs(result.percentage - roughAvg) / Math.max(roughStdDev, 1) > 2,
          factors: {
            recency: rWeight,
            sampleSize: sWeight,
            methodology: mWeight,
            credibility: iWeight,
            marginOfError: moeWeight,
            outlier: outlierWeight,
          },
          finalWeight,
          contribution: 0, // Will be calculated below
        });
      }
    }

    // 4. Calculate total weight and contributions
    const totalWeight = pollWeights.reduce((sum, p) => sum + p.finalWeight, 0);
    const weightedAvg =
      totalWeight > 0
        ? pollWeights.reduce((sum, p) => sum + p.percentage * p.finalWeight, 0) / totalWeight
        : 0;

    for (const p of pollWeights) {
      p.contribution = (p.percentage * p.finalWeight) / totalWeight * 100;
    }

    return NextResponse.json({
      electionId,
      electionName: election.name,
      weightedAverage: Math.round(weightedAvg * 10) / 10,
      polls: pollWeights,
      lastUpdated: new Date().toISOString(),
      totalWeight,
      pollCount: polls.length,
    });
  } catch (error) {
    console.error('Weight analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
