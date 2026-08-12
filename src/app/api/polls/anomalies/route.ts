/**
 * GET /api/polls/anomalies?threshold=5&confidence=0.6
 *
 * Detects and reports significant deviations from research baseline
 * across all states and positions
 */

import { NextRequest, NextResponse } from 'next/server';
import { aggregateStatePolls, compareWithResearchBaseline } from '@/lib/aggregation/state-aggregation';
import { getMockStateClient } from '@/lib/institutes/mock-state-clients';
import { supabase } from '@/lib/supabase/client';

interface AnomalyAlert {
  state: string;
  position: 'governador' | 'senador';
  candidateName: string;
  researchPercentage: number;
  aggregatedPercentage: number;
  deviation: number;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

function calculateSeverity(deviation: number, confidence: number): 'low' | 'medium' | 'high' | 'critical' {
  const score = Math.abs(deviation) * confidence;
  if (score >= 10) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse parameters
    const threshold = parseFloat(searchParams.get('threshold') || '5'); // Deviation %
    const minConfidence = parseFloat(searchParams.get('confidence') || '0.6'); // 0-1
    const days = parseInt(searchParams.get('days') || '30', 10);
    const states = (searchParams.get('states') || '').split(',').filter(s => s.trim());

    if (threshold < 0 || threshold > 50) {
      return NextResponse.json(
        { error: 'threshold must be between 0 and 50' },
        { status: 400 }
      );
    }

    if (minConfidence < 0 || minConfidence > 1) {
      return NextResponse.json(
        { error: 'confidence must be between 0 and 1' },
        { status: 400 }
      );
    }

    const referenceDate = new Date();
    const startDate = new Date(referenceDate.getTime() - days * 24 * 60 * 60 * 1000);

    // All states if not specified
    const STATES = states.length > 0 ? states : [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];

    const positions: Array<'governador' | 'senador'> = ['governador', 'senador'];

    const anomalies: AnomalyAlert[] = [];

    // Check each state and position
    for (const state of STATES) {
      for (const position of positions) {
        try {
          // Fetch polls
          let polls: any[] = [];

          try {
            const { data, error } = await supabase
              .from('polls')
              .select('*')
              .eq('state', state)
              .eq('position', position)
              .gte('published_at', startDate.toISOString())
              .lte('published_at', referenceDate.toISOString())
              .order('published_at', { ascending: false });

            if (!error && data) {
              polls = data;
            }
          } catch {
            console.warn(`Failed to fetch ${state} ${position} from Supabase`);
          }

          // Fallback to mock
          if (polls.length === 0) {
            const mockClient = getMockStateClient(state, 'quaest');
            if (mockClient) {
              const mockPolls = await mockClient.fetch();
              polls = mockPolls.flatMap(poll =>
                poll.results.map(result => ({
                  state,
                  position,
                  candidate_name: result.candidateName,
                  percentage: result.percentage,
                  margin_of_error: poll.marginOfError,
                  institute_name: poll.instituteName,
                  published_at: poll.publishDate.toISOString(),
                  sample_size: poll.sampleSize,
                }))
              );
            }
          }

          if (polls.length === 0) continue;

          // Aggregate
          const aggregationData = polls.map(poll => ({
            candidateName: poll.candidate_name,
            percentage: poll.percentage,
            marginOfError: poll.margin_of_error,
            publishDate: new Date(poll.published_at),
            instituteName: poll.institute_name,
            sampleSize: poll.sample_size,
          }));

          const result = aggregateStatePolls(aggregationData, state, position, referenceDate);
          const comparison = compareWithResearchBaseline(result);

          // Find significant deviations
          for (const deviation of comparison) {
            if (
              Math.abs(deviation.deviation) >= threshold &&
              deviation.confidence >= minConfidence &&
              deviation.isSignificant
            ) {
              anomalies.push({
                state,
                position,
                candidateName: deviation.candidateName,
                researchPercentage: deviation.researchPercentage,
                aggregatedPercentage: deviation.aggregatedPercentage,
                deviation: parseFloat(deviation.deviation.toFixed(2)),
                confidence: deviation.confidence,
                severity: calculateSeverity(deviation.deviation, deviation.confidence),
                timestamp: referenceDate.toISOString(),
              });
            }
          }
        } catch (err) {
          console.warn(`Error processing ${state} ${position}:`, err);
        }
      }
    }

    // Sort by severity and deviation
    anomalies.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return Math.abs(b.deviation) - Math.abs(a.deviation);
    });

    // Summary statistics
    const summary = {
      totalChecked: STATES.length * positions.length,
      anomaliesFound: anomalies.length,
      bySeverity: {
        critical: anomalies.filter(a => a.severity === 'critical').length,
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length,
      },
      affectedStates: [...new Set(anomalies.map(a => a.state))].sort(),
    };

    return NextResponse.json(
      {
        requestedAt: referenceDate.toISOString(),
        parameters: {
          deviationThreshold: threshold,
          confidenceThreshold: minConfidence,
          days,
        },
        summary,
        anomalies,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=1800', // Cache for 30 min
          'X-Anomaly-Count': anomalies.length.toString(),
          'X-Critical-Count': summary.bySeverity.critical.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Anomaly detection error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/polls/anomalies/alert
 *
 * Trigger notifications for critical anomalies
 * (Integration point for Slack, email, etc)
 */
export async function POST(request: NextRequest) {
  try {
    const { anomaly, notificationChannels = ['log'] } = await request.json();

    if (!anomaly) {
      return NextResponse.json({ error: 'anomaly data required' }, { status: 400 });
    }

    const message = `
🚨 ELECTION POLL ANOMALY DETECTED

State: ${anomaly.state}
Position: ${anomaly.position}
Candidate: ${anomaly.candidateName}

Research Baseline: ${anomaly.researchPercentage}%
Current Aggregation: ${anomaly.aggregatedPercentage}%
Deviation: ${anomaly.deviation > 0 ? '+' : ''}${anomaly.deviation}%
Confidence: ${(anomaly.confidence * 100).toFixed(0)}%

Severity: ${anomaly.severity.toUpperCase()}

Detection Time: ${new Date(anomaly.timestamp).toLocaleString()}
    `.trim();

    // Log all anomalies
    console.log(message);

    // Integration points (implement as needed)
    const responses: Record<string, any> = {
      log: { status: 'sent', method: 'console.log' },
    };

    // TODO: Implement Slack integration
    if (notificationChannels.includes('slack')) {
      responses.slack = {
        status: 'pending',
        method: 'Slack webhook',
        note: 'Not implemented yet',
      };
    }

    // TODO: Implement email integration
    if (notificationChannels.includes('email')) {
      responses.email = {
        status: 'pending',
        method: 'Email notification',
        note: 'Not implemented yet',
      };
    }

    return NextResponse.json(
      {
        alertedAt: new Date().toISOString(),
        anomaly,
        channels: responses,
      },
      { status: 202 } // Accepted
    );
  } catch (error) {
    console.error('Alert error:', error);
    return NextResponse.json(
      { error: 'Failed to process alert' },
      { status: 500 }
    );
  }
}
