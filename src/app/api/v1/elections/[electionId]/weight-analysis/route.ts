/**
 * API Endpoint: GET /api/v1/elections/[electionId]/weight-analysis
 *
 * Returns detailed weight analysis for all polls in an election
 * Calculates all 6 weight factors for visualization
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

interface Database {
  polls: {
    id: string;
    election_id: string;
    institute_name: string;
    publication_date: string;
    fieldwork_end: string;
    sample_size: number;
    methodology: string;
    credibility_score?: number;
    margin_of_error?: number;
  };
  poll_results: {
    poll_id: string;
    candidate_id: string;
    percentage: number;
  };
  weighted_averages: {
    election_id: string;
    weighted_average: number;
    confidence_interval_low: number;
    confidence_interval_high: number;
  };
}

const RECENCY_HALF_LIFE_DAYS = 14;
const BASELINE_MOE = 2.5;

function getRecencyWeight(daysOld: number): number {
  return Math.pow(0.5, daysOld / RECENCY_HALF_LIFE_DAYS);
}

function getSampleSizeWeight(sampleSize: number): number {
  return Math.sqrt(sampleSize / 1000);
}

function getMethodologyWeight(methodology: string): number {
  const weights: Record<string, number> = {
    presencial: 1.0,
    telefonica: 0.95,
    mista: 0.85,
    online: 0.9,
  };
  return weights[methodology?.toLowerCase()] || 0.5;
}

function getCredibilityWeight(score?: number): number {
  const credScore = Math.max(0, Math.min(10, score ?? 5));
  return Math.pow(credScore / 10, 1.5);
}

function getMoEWeight(moe?: number): number {
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
  { params }: { params: { electionId: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch election and polls
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('id, name')
      .eq('id', params.electionId)
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
        institute_name,
        publication_date,
        fieldwork_end,
        sample_size,
        methodology,
        credibility_score,
        margin_of_error,
        poll_results(
          candidate_id,
          percentage
        )
      `)
      .eq('election_id', params.electionId)
      .order('fieldwork_end', { ascending: false });

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
      const iWeight = getCredibilityWeight(poll.credibility_score);
      const moeWeight = getMoEWeight(poll.margin_of_error);

      // Calculate rough average for outlier detection
      const percentages = poll.poll_results?.map((r: any) => r.percentage) || [];
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

        pollWeights.push({
          pollId: `${poll.id}-${result.candidate_id}`,
          instituteName: poll.institute_name,
          percentage: result.percentage,
          sampleSize: poll.sample_size,
          methodology: poll.methodology,
          credibilityScore: poll.credibility_score || 5,
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
      electionId: params.electionId,
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
