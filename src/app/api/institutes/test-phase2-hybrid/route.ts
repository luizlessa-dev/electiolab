/**
 * API Endpoint: Phase 2 Hybrid Test
 *
 * GET /api/institutes/test-phase2-hybrid?mode=[mock|single|parallel|live]
 *
 * Tests Phase 2.5 institutes with Hybrid scraper (Cheerio + Lambda)
 *
 * Mode details:
 * - mock: instant synthetic data
 * - single&institute=poderdata: test specific institute
 * - parallel: all 7 institutes concurrently
 * - live: real scraping with caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { router as scraperRouter } from '@/lib/institutes/scraper-router';
import { cache } from '@/lib/institutes/cache-layer';

// Phase 2.5 Institute URLs
const PHASE2_INSTITUTES = [
  {
    id: 'poderdata',
    name: 'PoderData',
    url: 'https://www.poderdata.com.br/pesquisas-eleitorais',
    type: 'complex' as const,
  },
  {
    id: 'atlasinteligencia',
    name: 'Atlas Inteligência',
    url: 'https://www.atlasinteligencia.com.br/pesquisa-eleitoral',
    type: 'complex' as const,
  },
  {
    id: 'ictouch',
    name: 'IcTouch',
    url: 'https://www.ictouch.com.br/pesquisa-eleitoral',
    type: 'complex' as const,
  },
  {
    id: 'futura',
    name: 'Futura',
    url: 'https://www.futura.org.br/pesquisas',
    type: 'simple' as const,
  },
  {
    id: 'xp',
    name: 'XP Investimentos',
    url: 'https://www.xpi.com.br/inteligencia/pesquisas',
    type: 'complex' as const,
  },
  {
    id: 'framework',
    name: 'Framework',
    url: 'https://www.framework.com.br/pesquisa-eleitoral',
    type: 'simple' as const,
  },
  {
    id: 'verithas',
    name: 'Verithas',
    url: 'https://www.verithas.com.br/pesquisas',
    type: 'simple' as const,
  },
];

interface TestResult {
  instituteId: string;
  instituteName: string;
  strategy: string;
  success: boolean;
  duration: number;
  error?: string;
  cached?: boolean;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const mode = request.nextUrl.searchParams.get('mode') || 'parallel';
  const instituteId = request.nextUrl.searchParams.get('institute');

  try {
    switch (mode) {
      case 'mock':
        return NextResponse.json({
          mode: 'mock',
          institutes: PHASE2_INSTITUTES.map(i => ({
            instituteId: i.id,
            instituteName: i.name,
            success: true,
            strategy: i.type === 'complex' ? 'lambda' : 'cheerio',
            duration: Math.random() * 1000 + 200,
            cached: false,
          })),
          timestamp: new Date().toISOString(),
        });

      case 'single':
        if (!instituteId) {
          return NextResponse.json(
            { error: 'institute parameter required for single mode' },
            { status: 400 }
          );
        }

        const institute = PHASE2_INSTITUTES.find(i => i.id === instituteId);
        if (!institute) {
          return NextResponse.json(
            { error: `Unknown institute: ${instituteId}` },
            { status: 404 }
          );
        }

        return await testSingle(institute);

      case 'parallel':
      case 'live':
        return await testParallel();

      default:
        return NextResponse.json(
          { error: 'Invalid mode. Use: mock, single, parallel, live' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Phase2 Test] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Test single institute
 */
async function testSingle(institute: (typeof PHASE2_INSTITUTES)[0]): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Check cache first
    const cacheKey = `phase2:${institute.id}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return NextResponse.json({
        mode: 'single',
        institute: {
          instituteId: institute.id,
          instituteName: institute.name,
          success: true,
          strategy: 'cache',
          duration: Date.now() - startTime,
          cached: true,
        },
        data: cached,
      });
    }

    // Route scrape request
    const result = await scraperRouter.route({
      url: institute.url,
      instituteId: institute.id,
      instituteType: institute.type,
    });

    // Cache result
    if (result.success && result.data) {
      await cache.set(cacheKey, result.data, 86400);
    }

    return NextResponse.json({
      mode: 'single',
      institute: {
        instituteId: institute.id,
        instituteName: institute.name,
        success: result.success,
        strategy: result.strategy,
        duration: result.duration,
        cached: false,
        error: result.error,
      },
      data: result.success ? result.data : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        institute: {
          instituteId: institute.id,
          instituteName: institute.name,
          success: false,
          strategy: 'failed',
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Test all institutes in parallel with timeout
 */
async function testParallel(): Promise<NextResponse> {
  const startTime = Date.now();
  const timeout = 30000; // 30 second timeout

  const promises = PHASE2_INSTITUTES.map(async inst => {
    try {
      const cacheKey = `phase2:${inst.id}`;
      const cached = await cache.get(cacheKey);

      if (cached) {
        return {
          instituteId: inst.id,
          instituteName: inst.name,
          success: true,
          strategy: 'cache',
          duration: Date.now() - startTime,
          cached: true,
        } as TestResult;
      }

      // Race against timeout
      const result = (await Promise.race([
        scraperRouter.route({
          url: inst.url,
          instituteId: inst.id,
          instituteType: inst.type,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        ),
      ])) as Awaited<ReturnType<typeof scraperRouter.route>>;

      if (result.success && result.data) {
        await cache.set(cacheKey, result.data, 86400);
      }

      return {
        instituteId: inst.id,
        instituteName: inst.name,
        success: result.success,
        strategy: result.strategy,
        duration: result.duration,
        cached: false,
      } as TestResult;
    } catch (error) {
      return {
        instituteId: inst.id,
        instituteName: inst.name,
        success: false,
        strategy: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as TestResult;
    }
  });

  const results = await Promise.all(promises);
  const stats = cache.getStats();

  const summary = {
    mode: 'parallel',
    timestamp: new Date().toISOString(),
    totalDuration: Date.now() - startTime,
    institutes: results,
    summary: {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      successRate: (results.filter(r => r.success).length / results.length) * 100,
      avgDuration:
        results.reduce((acc, r) => acc + r.duration, 0) / results.length,
    },
    cache: stats,
  };

  return NextResponse.json(summary);
}
