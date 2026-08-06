/**
 * API Endpoint: Hybrid Scraper (Cheerio + Lambda Layer)
 *
 * POST /api/institutes/scrape-hybrid
 *
 * Intelligently routes scraping requests:
 * - Cheerio for 80% (fast, <50ms cold start)
 * - Lambda for 20% complex (full JS rendering)
 * - External fallback if needed
 *
 * Returns: Parsed poll data or raw HTML
 */

import { NextRequest, NextResponse } from 'next/server';
import { router } from '@/lib/institutes/scraper-router';
import { cache } from '@/lib/institutes/cache-layer';

interface ScrapeRequest {
  url: string;
  instituteId: string;
  forceStrategy?: 'simple' | 'complex';
  useCache?: boolean;
}

interface ScrapeResponse {
  success: boolean;
  strategy: string;
  data?: any;
  cached: boolean;
  duration: number;
  cacheHitRate?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request
    const body: ScrapeRequest = await request.json();

    // Validate auth (basic token)
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (token !== process.env.SCRAPER_AUTH_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate inputs
    if (!body.url || !body.instituteId) {
      return NextResponse.json(
        { error: 'Missing url or instituteId' },
        { status: 400 }
      );
    }

    const cacheKey = `scrape:${body.instituteId}:${body.url}`;
    const useCache = body.useCache !== false;

    // Try cache first
    if (useCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log(`[API] Cache hit for ${body.instituteId}`);
        const stats = cache.getStats();

        return NextResponse.json({
          success: true,
          strategy: 'cache',
          data: cached,
          cached: true,
          duration: 0,
          cacheHitRate: stats.hitRate,
        });
      }
    }

    // Route to scraper
    const result = await router.route({
      url: body.url,
      instituteId: body.instituteId,
      instituteType: body.forceStrategy ? body.forceStrategy : 'auto',
    });

    if (result.success && result.data) {
      // Cache result
      await cache.set(cacheKey, result.data, 86400); // 24 hours

      const stats = cache.getStats();
      return NextResponse.json({
        success: true,
        strategy: result.strategy,
        data: result.data,
        cached: false,
        duration: result.duration,
        cacheHitRate: stats.hitRate,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          strategy: result.strategy,
          duration: result.duration,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Scrape error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/institutes/scrape-hybrid/stats
 * Returns cache statistics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (token !== process.env.SCRAPER_AUTH_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = cache.getStats();
  return NextResponse.json({
    cache: stats,
    timestamp: new Date().toISOString(),
  });
}
