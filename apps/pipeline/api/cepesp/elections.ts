/**
 * API: GET /api/cepesp/elections/:year/:position
 * Dados eleitorais históricos via Wikipedia
 */

import { NextRequest, NextResponse } from 'next/server';
import { wikipediaFetcher } from '../../lib/cepesp/wikipedia-fetcher';

export async function GET(
  request: NextRequest,
  { params }: { params: { year: string; position: string } }
) {
  try {
    const year = parseInt(params.year);
    const position = params.position;

    if (!year || !position) {
      return NextResponse.json(
        { error: 'year e position são obrigatórios' },
        { status: 400 }
      );
    }

    let data;

    if (position === 'president' || position === 'presidente') {
      data = await wikipediaFetcher.fetchPresidential(year, 2);
    } else {
      return NextResponse.json(
        { error: `Position ${position} não suportado. Use: president` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
