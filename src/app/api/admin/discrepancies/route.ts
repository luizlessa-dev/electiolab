/**
 * GET/POST /api/admin/discrepancies
 *
 * Manage discrepancies:
 * - GET: List discrepancies with filters
 * - POST: Resolve discrepancies
 *
 * Requires authentication via API key (Authorization: Bearer <key> or X-API-Key: <key>)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { discrepancyManager, type DiscrepancyFilter } from '@/lib/admin/discrepancy-manager';
import { DiscrepancyFilterSchema } from '@/lib/validation/wave4';
import { requireAdminAuth, checkRateLimit, getClientIdentifier } from '@/lib/middleware/auth';
import { handleError, successResponse, ValidationError } from '@/lib/utils/error-handler';

/**
 * GET - List discrepancies
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authError = await requireAdminAuth(request);
    if (authError) return authError;

    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, 100, 60000); // 100 per minute
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Validate query parameters
    const filterData = {
      state: searchParams.get('state') || undefined,
      position: searchParams.get('position') || undefined,
      severity: searchParams.get('severity') || undefined,
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    };

    const validatedFilter = DiscrepancyFilterSchema.parse(filterData);

    // Get discrepancies
    const discrepancies = await discrepancyManager.getDiscrepancies(validatedFilter as DiscrepancyFilter);

    // Get stats
    const stats = await discrepancyManager.getStats();
    const unresolvedCount = await discrepancyManager.getUnresolvedCount();

    return successResponse(
      {
        items: discrepancies,
        pagination: {
          limit: validatedFilter.limit,
          offset: validatedFilter.offset,
          total: discrepancies.length,
        },
        stats: {
          ...stats,
          unresolvedCount,
        },
      },
      200,
      {
        'Cache-Control': 'no-cache',
        'X-Total-Discrepancies': stats.total.toString(),
        'X-Unresolved': unresolvedCount.toString(),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      }
    );
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST - Resolve discrepancies
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authError = await requireAdminAuth(request);
    if (authError) return authError;

    // Rate limiting (stricter for mutations)
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, 50, 60000); // 50 per minute
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate request body
    const schema = z.object({
      ids: z.array(z.string()).min(1),
      status: z.enum(['verified', 'dismissed', 'escalated', 'pending']),
      resolvedBy: z.string().optional(),
      notes: z.string().optional(),
    });

    const validated = schema.parse(body);

    // Resolve discrepancies
    const updated = await discrepancyManager.resolveBatch(
      validated.ids,
      validated.status,
      validated.resolvedBy || 'system'
    );

    console.log(`[Admin] Resolved ${updated.length} discrepancies to status: ${validated.status}`);

    return successResponse(
      {
        message: `Resolved ${updated.length} discrepancies`,
        updated,
        resolvedAt: new Date().toISOString(),
      },
      200,
      {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      }
    );
  } catch (error) {
    return handleError(error);
  }
}
