/**
 * POST /api/alerts/anomaly
 *
 * Send anomaly alerts via configured channels (Slack, Email, etc)
 * Automatically creates discrepancy if deviation is significant
 *
 * Optional authentication (recommended for production)
 */

import { NextRequest } from 'next/server';
import { AnomalyAlertSchema } from '@/lib/validation/wave4';
import { handleError, successResponse } from '@/lib/utils/error-handler';
import { validateApiKey, checkRateLimit, getClientIdentifier } from '@/lib/middleware/auth';
import { getOrchestrator } from '@/lib/services/wave4-orchestrator';

export async function POST(request: NextRequest) {
  try {
    // Auth check (optional if key not configured)
    const isAuthed = validateApiKey(request);
    if (!isAuthed && process.env.WAVE4_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, 200, 60000); // 200 per minute
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validated = AnomalyAlertSchema.parse(body);

    // Log alert
    console.log(`[Alert] ANOMALY: ${validated.anomaly.state} - ${validated.anomaly.candidateName}`);
    console.log(`  Severity: ${validated.anomaly.severity}`);
    console.log(`  Deviation: ${validated.anomaly.deviation}%`);
    console.log(`  Confidence: ${(validated.anomaly.confidence * 100).toFixed(0)}%`);

    const result = await getOrchestrator().handleAnomalyDetected(
      validated.anomaly,
      validated.channels,
      {
        emailRecipients: validated.emailRecipients,
        slackMentions: validated.slackMentions,
      }
    );

    return successResponse(
      {
        message: 'Anomaly alert processed',
        anomalyId: result.anomalyId,
        anomaly: {
          state: validated.anomaly.state,
          candidate: validated.anomaly.candidateName,
          severity: validated.anomaly.severity,
          deviation: validated.anomaly.deviation,
        },
        notificationsSent: result.notificationsSent,
        timestamp: new Date().toISOString(),
      },
      202, // Accepted
      {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      }
    );
  } catch (error) {
    return handleError(error);
  }
}
