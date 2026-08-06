/**
 * Test Endpoint: Tier 3 Institutes Scraper
 *
 * GET /api/institutes/test-tier3?mode=mock|live
 *
 * Modes:
 * - mock: Returns mock data (instant, no external calls)
 * - live: Attempts to scrape actual data (may be slow)
 * - parallel: Runs all 25 institutes in parallel
 * - single: Test single institute
 *
 * Response: Array of polls from all tier 3 institutes
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  tier3Clients,
  ipespClient,
  voxPopuliClient,
  dataEstrategicaClient,
  agrPesquisasClient,
  cifraPesquisasClient,
  lapopClient,
  cepespClient,
  opeClient,
  dataAgsClient,
  mdaInteriorClient,
  paranaPesquisasClient,
  exitusClient,
  pesquisaBrasilClient,
  iplanarIOClient,
  semplaClient,
  pesquisaMinasClient,
  bahiaPesquisasClient,
  pesquisaPernambucosClient,
  opiniaoBrasilClient,
  sondagemBrasilClient,
  consultaPopularClient,
  monitoraBrasilClient,
  pulseBrasilClient,
  kantarIBOPEClient,
  cntSensusClient,
  mosaicoPesquisasClient,
  btgPactualClient,
  bainBrazilClient,
} from '@/lib/institutes/tier3-institutes';
import { Poll } from '@/lib/institutes/institute-client-base';

/**
 * Generate mock poll data for a single institute
 */
function generateMockPoll(instituteId: string, instituteName: string): Poll {
  const now = new Date();
  const candidates = [
    { name: 'Candidate A', pct: 35 + Math.random() * 10 },
    { name: 'Candidate B', pct: 30 + Math.random() * 10 },
    { name: 'Candidate C', pct: 20 + Math.random() * 8 },
    { name: 'Undecided', pct: 15 + Math.random() * 5 },
  ];

  return {
    id: `${instituteId}-${Date.now()}`,
    instituteId,
    instituteName,
    publishDate: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
    fieldworkEnd: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    fieldworkStart: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    sampleSize: 1000 + Math.floor(Math.random() * 2000),
    marginOfError: 2 + Math.random() * 2,
    confidenceLevel: 95,
    methodology: 'presencial',
    results: candidates.map((c) => ({
      candidateId: c.name.toLowerCase().replace(/\s+/g, '-'),
      candidateName: c.name,
      percentage: parseFloat(c.pct.toFixed(2)),
    })),
    sourceUrl: `https://example.com/${instituteId}`,
    isVerified: false,
    reliabilityScore: 0.65 + Math.random() * 0.15,
  };
}

/**
 * Mock all Tier 3 institutes
 */
function generateMockTier3Data(): Record<string, Poll[]> {
  const mockData: Record<string, Poll[]> = {};

  const institutes = [
    { id: 'ipesp', name: 'IPESP' },
    { id: 'vox-populi', name: 'Vox Populi' },
    { id: 'data-estrategica', name: 'Data Estratégica' },
    { id: 'agr-pesquisas', name: 'AGR Pesquisas' },
    { id: 'cifra-pesquisas', name: 'Cifra Pesquisas' },
    { id: 'lapop', name: 'LAPOP' },
    { id: 'cepesp', name: 'CEPESP' },
    { id: 'ope', name: 'Observatório de Política Exterior' },
    { id: 'dataags', name: 'DataAgs' },
    { id: 'mda-interior', name: 'MDA Interior' },
    { id: 'parana-pesquisas', name: 'Paraná Pesquisas' },
    { id: 'exitus', name: 'Exitus' },
    { id: 'pesquisa-brasil', name: 'Pesquisa Brasil' },
    { id: 'iplanario', name: 'IPLANARIO' },
    { id: 'sempla', name: 'SEMPLA' },
    { id: 'pesquisa-minas', name: 'Pesquisa Minas' },
    { id: 'bahia-pesquisas', name: 'Bahia Pesquisas' },
    { id: 'pesquisa-pernambuco', name: 'Pesquisa Pernambuco' },
    { id: 'opiniao-brasil', name: 'Opinião Brasil' },
    { id: 'sondagem-brasil', name: 'Sondagem Brasil' },
    { id: 'consulta-popular', name: 'Consulta Popular' },
    { id: 'monitora-brasil', name: 'Monitora Brasil' },
    { id: 'pulse-brasil', name: 'Pulse Brasil' },
    { id: 'kantar-ibope', name: 'Kantar IBOPE' },
    { id: 'cnt-sensus', name: 'CNT/Sensus' },
    { id: 'mosaico-pesquisas', name: 'Mosaico Pesquisas' },
    { id: 'btg-pactual', name: 'BTG Pactual Research' },
    { id: 'bain-brazil', name: 'Bain & Company Brazil' },
  ];

  for (const inst of institutes) {
    mockData[inst.id] = [generateMockPoll(inst.id, inst.name)];
  }

  return mockData;
}

/**
 * Test single institute (for debugging)
 */
async function testSingleInstitute(
  instituteId: string
): Promise<{ institute: string; success: boolean; pollCount: number; error?: string }> {
  const clientMap: Record<string, any> = {
    ipesp: ipespClient,
    'vox-populi': voxPopuliClient,
    'data-estrategica': dataEstrategicaClient,
    'agr-pesquisas': agrPesquisasClient,
    'cifra-pesquisas': cifraPesquisasClient,
    lapop: lapopClient,
    cepesp: cepespClient,
    ope: opeClient,
    dataags: dataAgsClient,
    'mda-interior': mdaInteriorClient,
    'parana-pesquisas': paranaPesquisasClient,
    exitus: exitusClient,
    'pesquisa-brasil': pesquisaBrasilClient,
    iplanario: iplanarIOClient,
    sempla: semplaClient,
    'pesquisa-minas': pesquisaMinasClient,
    'bahia-pesquisas': bahiaPesquisasClient,
    'pesquisa-pernambuco': pesquisaPernambucosClient,
    'opiniao-brasil': opiniaoBrasilClient,
    'sondagem-brasil': sondagemBrasilClient,
    'consulta-popular': consultaPopularClient,
    'monitora-brasil': monitoraBrasilClient,
    'pulse-brasil': pulseBrasilClient,
    'kantar-ibope': kantarIBOPEClient,
    'cnt-sensus': cntSensusClient,
    'mosaico-pesquisas': mosaicoPesquisasClient,
    'btg-pactual': btgPactualClient,
    'bain-brazil': bainBrazilClient,
  };

  const client = clientMap[instituteId];
  if (!client) {
    return {
      institute: instituteId,
      success: false,
      pollCount: 0,
      error: `Institute not found: ${instituteId}`,
    };
  }

  try {
    const polls = await Promise.race([
      client.fetch(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout after 30s')), 30000)
      ),
    ]);

    return {
      institute: instituteId,
      success: true,
      pollCount: (polls as Poll[]).length,
    };
  } catch (error) {
    return {
      institute: instituteId,
      success: false,
      pollCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test all institutes in parallel (with timeout)
 */
async function testAllInstitutes(): Promise<
  {
    institute: string;
    success: boolean;
    pollCount: number;
    error?: string;
  }[]
> {
  const results = await Promise.allSettled(
    tier3Clients.map((client) =>
      Promise.race([
        client.fetch(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout after 30s')), 30000)
        ),
      ]).then((polls) => ({
        institute: (client as any).scraperConfig?.instituteName || 'Unknown',
        instituteId: (client as any).scraperConfig?.instituteId || 'unknown',
        success: true,
        pollCount: (polls as Poll[]).length,
      }))
    )
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return {
        institute: result.value.institute,
        success: result.value.success,
        pollCount: result.value.pollCount,
      };
    } else {
      const client = tier3Clients[index] as any;
      return {
        institute: client.scraperConfig?.instituteName || 'Unknown',
        success: false,
        pollCount: 0,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    }
  });
}

/**
 * Main handler
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('mode') || 'mock';
  const instituteId = searchParams.get('institute');

  try {
    // Mode 1: Mock data (instant)
    if (mode === 'mock') {
      const mockData = generateMockTier3Data();
      const allPolls = Object.values(mockData).flat();

      return NextResponse.json({
        success: true,
        mode: 'mock',
        timestamp: new Date().toISOString(),
        summary: {
          totalInstitutes: Object.keys(mockData).length,
          totalPolls: allPolls.length,
          avgReliability:
            allPolls.reduce((sum, p) => sum + p.reliabilityScore, 0) / allPolls.length,
        },
        data: mockData,
      });
    }

    // Mode 2: Test single institute
    if (mode === 'single' && instituteId) {
      const result = await testSingleInstitute(instituteId);
      return NextResponse.json({
        success: result.success,
        mode: 'single',
        timestamp: new Date().toISOString(),
        result,
      });
    }

    // Mode 3: Test all institutes in parallel
    if (mode === 'parallel' || mode === 'live') {
      const results = await testAllInstitutes();
      const successCount = results.filter((r) => r.success).length;
      const totalPollCount = results.reduce((sum, r) => sum + r.pollCount, 0);

      return NextResponse.json({
        success: true,
        mode: 'parallel',
        timestamp: new Date().toISOString(),
        summary: {
          totalInstitutes: results.length,
          successfulInstitutes: successCount,
          successRate: `${((successCount / results.length) * 100).toFixed(1)}%`,
          totalPollsExtracted: totalPollCount,
        },
        results,
      });
    }

    return NextResponse.json(
      {
        error: 'Invalid mode',
        validModes: ['mock', 'single', 'parallel', 'live'],
        example: '/api/institutes/test-tier3?mode=mock',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[test-tier3] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
