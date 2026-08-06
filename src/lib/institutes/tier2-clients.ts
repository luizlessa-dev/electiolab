/**
 * Tier 2 Institute Clients - Implementation
 *
 * Complete implementations for Ipespe, MDA, FSB, RTBD
 * Using BrowserScraperBase for JavaScript-heavy sites
 */

import { BrowserScraperBase } from './browser-scraper-base';
import { Poll } from './institute-client-base';

/**
 * Ipespe - Traditional polling institute
 */
export class IpespeClientImpl extends BrowserScraperBase {
  constructor() {
    super({
      instituteId: 'ipespe',
      instituteName: 'Ipespe',
      reliabilityScore: 0.80,
      baseUrl: 'https://www.ipespe.com.br',
      pollSelectors: {
        container: '[data-poll], .poll, .pesquisa, .resultado',
      },
    });
  }

  protected extractPollsFromHTML(html: string): Poll[] {
    return this.extractPolls(html);
  }

  private extractPolls(html: string): Poll[] {
    const polls: Poll[] = [];

    // Try JSON patterns
    const jsonMatch = html.match(/window\.__DATA__\s*=\s*({[\s\S]*?});/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const pollsArray = data.polls || data.pesquisas || [];
        if (Array.isArray(pollsArray)) {
          for (const raw of pollsArray.slice(0, 5)) {
            try {
              const poll = this.normalizePoll({
                id: raw.id || `ipespe-${Date.now()}`,
                publishDate: new Date(raw.data_publicacao || new Date()),
                fieldworkEnd: new Date(raw.data_fim || new Date()),
                sampleSize: parseInt(String(raw.tamanho_amostra || 1000)),
                methodology: 'presencial',
                results: this.parseResults(raw.resultados || []),
                sourceUrl: this.config.baseUrl,
              });
              if (poll.results.length > 0) polls.push(poll);
            } catch (e) {
              // Skip invalid
            }
          }
          if (polls.length > 0) return polls;
        }
      } catch (e) {
        // Continue to HTML fallback
      }
    }

    // HTML fallback
    const candPattern = /([A-ZÀ-Ÿ][a-zà-ÿ\s]{2,})\s*[:\-–]\s*(\d+(?:[.,]\d+)?)\s*%/g;
    let match;
    const results: Poll['results'] = [];

    while ((match = candPattern.exec(html))) {
      results.push({
        candidateName: match[1].trim(),
        candidateId: match[1].toLowerCase().replace(/\s+/g, '-'),
        percentage: parseFloat(match[2].replace(',', '.')),
      });
    }

    if (results.length > 0) {
      polls.push(
        this.normalizePoll({
          id: `ipespe-${Date.now()}`,
          publishDate: new Date(),
          fieldworkEnd: new Date(),
          sampleSize: 1000,
          methodology: 'presencial',
          results,
          sourceUrl: this.config.baseUrl,
        })
      );
    }

    return polls;
  }

  private parseResults(results: any[]): Poll['results'] {
    if (!Array.isArray(results)) return [];
    return results
      .map(r => {
        const name = String(r.candidato_nome || r.nome || '');
        const pct = parseFloat(String(r.percentual || '0'));
        return name && pct > 0
          ? {
              candidateName: name,
              candidateId: name.toLowerCase().replace(/\s+/g, '-'),
              percentage: pct,
            }
          : null;
      })
      .filter(Boolean) as Poll['results'];
  }
}

/**
 * MDA Consultoria - Regional focus
 */
export class MDAClientImpl extends BrowserScraperBase {
  constructor() {
    super({
      instituteId: 'mda',
      instituteName: 'MDA Consultoria',
      reliabilityScore: 0.75,
      baseUrl: 'https://www.mdaconsultoria.com.br',
      pollSelectors: {
        container: '[data-poll], .poll, article, .pesquisa',
      },
    });
  }

  protected extractPollsFromHTML(html: string): Poll[] {
    const polls: Poll[] = [];

    // MDA likely publishes monthly reports
    // Extract from common patterns
    const candPattern = /([A-ZÀ-Ÿ][a-zà-ÿ\s]{2,})\s*[:\-–]\s*(\d+(?:[.,]\d+)?)\s*%/g;
    let match;
    const results: Poll['results'] = [];

    while ((match = candPattern.exec(html))) {
      results.push({
        candidateName: match[1].trim(),
        candidateId: match[1].toLowerCase().replace(/\s+/g, '-'),
        percentage: parseFloat(match[2].replace(',', '.')),
      });
    }

    if (results.length > 0) {
      polls.push(
        this.normalizePoll({
          id: `mda-${Date.now()}`,
          publishDate: new Date(),
          fieldworkEnd: new Date(),
          sampleSize: 1200,
          methodology: 'presencial',
          results,
          sourceUrl: this.config.baseUrl,
        })
      );
    }

    return polls;
  }
}

/**
 * FSB Pesquisa - Specialized research
 */
export class FSBClientImpl extends BrowserScraperBase {
  constructor() {
    super({
      instituteId: 'fsb',
      instituteName: 'FSB Pesquisa',
      reliabilityScore: 0.78,
      baseUrl: 'https://www.fsb.com.br',
      pollSelectors: {
        container: '[data-poll], .poll, .resultado, article',
      },
    });
  }

  protected extractPollsFromHTML(html: string): Poll[] {
    const polls: Poll[] = [];

    // FSB may have PDF reports - extract text data
    const candPattern = /([A-ZÀ-Ÿ][a-zà-ÿ\s]{2,})\s*[:\-–]\s*(\d+(?:[.,]\d+)?)\s*%/g;
    let match;
    const results: Poll['results'] = [];

    while ((match = candPattern.exec(html))) {
      results.push({
        candidateName: match[1].trim(),
        candidateId: match[1].toLowerCase().replace(/\s+/g, '-'),
        percentage: parseFloat(match[2].replace(',', '.')),
      });
    }

    if (results.length > 0) {
      polls.push(
        this.normalizePoll({
          id: `fsb-${Date.now()}`,
          publishDate: new Date(),
          fieldworkEnd: new Date(),
          sampleSize: 1300,
          methodology: 'mista',
          results,
          sourceUrl: this.config.baseUrl,
        })
      );
    }

    return polls;
  }
}

/**
 * Real Time Big Data - Tech-forward polling
 */
export class RTBDClientImpl extends BrowserScraperBase {
  constructor() {
    super({
      instituteId: 'rtbd',
      instituteName: 'Real Time Big Data',
      reliabilityScore: 0.76,
      baseUrl: 'https://www.realtimebigdata.com.br',
      pollSelectors: {
        container: '[data-tracking], .tracking, [data-poll], .poll',
      },
    });
  }

  protected extractPollsFromHTML(html: string): Poll[] {
    const polls: Poll[] = [];

    // Try to find JSON data
    const jsonMatch = html.match(/window\.__TRACKING__\s*=\s*({[\s\S]*?});/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const pollsArray = data.polls || data.tracking || [];
        if (Array.isArray(pollsArray)) {
          for (const raw of pollsArray.slice(0, 5)) {
            try {
              const poll = this.normalizePoll({
                id: raw.id || `rtbd-${Date.now()}`,
                publishDate: new Date(raw.date || new Date()),
                fieldworkEnd: new Date(raw.date || new Date()),
                sampleSize: parseInt(String(raw.n || 1000)),
                methodology: 'online',
                results: this.parseResults(raw.results || raw.candidatos || []),
                sourceUrl: this.config.baseUrl,
              });
              if (poll.results.length > 0) polls.push(poll);
            } catch (e) {
              // Skip invalid
            }
          }
          if (polls.length > 0) return polls;
        }
      } catch (e) {
        // Continue to HTML fallback
      }
    }

    // HTML fallback - RTBD may have interactive widgets
    const candPattern = /([A-ZÀ-Ÿ][a-zà-ÿ\s]{2,})\s*[:\-–]\s*(\d+(?:[.,]\d+)?)\s*%/g;
    let match;
    const results: Poll['results'] = [];

    while ((match = candPattern.exec(html))) {
      results.push({
        candidateName: match[1].trim(),
        candidateId: match[1].toLowerCase().replace(/\s+/g, '-'),
        percentage: parseFloat(match[2].replace(',', '.')),
      });
    }

    if (results.length > 0) {
      polls.push(
        this.normalizePoll({
          id: `rtbd-${Date.now()}`,
          publishDate: new Date(),
          fieldworkEnd: new Date(),
          sampleSize: 1100,
          methodology: 'online',
          results,
          sourceUrl: this.config.baseUrl,
        })
      );
    }

    return polls;
  }

  private parseResults(results: any[]): Poll['results'] {
    if (!Array.isArray(results)) return [];
    return results
      .map(r => {
        const name = String(r.candidateName || r.name || r.candidato || '');
        const pct = parseFloat(String(r.percentage || r.pct || '0'));
        return name && pct > 0
          ? {
              candidateName: name,
              candidateId: name.toLowerCase().replace(/\s+/g, '-'),
              percentage: pct,
            }
          : null;
      })
      .filter(Boolean) as Poll['results'];
  }
}

/**
 * Genial/Quaest - Partnership
 */
export class GenialQuaestClientImpl extends BrowserScraperBase {
  constructor() {
    super({
      instituteId: 'genial-quaest',
      instituteName: 'Genial/Quaest',
      reliabilityScore: 0.79,
      baseUrl: 'https://www.genial.com/pesquisa',
      pollSelectors: {
        container: '[data-poll], .poll, .pesquisa',
      },
    });
  }

  protected extractPollsFromHTML(html: string): Poll[] {
    const polls: Poll[] = [];

    // Genial may have structured data
    const candPattern = /([A-ZÀ-Ÿ][a-zà-ÿ\s]{2,})\s*[:\-–]\s*(\d+(?:[.,]\d+)?)\s*%/g;
    let match;
    const results: Poll['results'] = [];

    while ((match = candPattern.exec(html))) {
      results.push({
        candidateName: match[1].trim(),
        candidateId: match[1].toLowerCase().replace(/\s+/g, '-'),
        percentage: parseFloat(match[2].replace(',', '.')),
      });
    }

    if (results.length > 0) {
      polls.push(
        this.normalizePoll({
          id: `genial-${Date.now()}`,
          publishDate: new Date(),
          fieldworkEnd: new Date(),
          sampleSize: 1150,
          methodology: 'mista',
          results,
          sourceUrl: this.config.baseUrl,
        })
      );
    }

    return polls;
  }
}

// Export singletons
export const ipespeClient = new IpespeClientImpl();
export const mdaClient = new MDAClientImpl();
export const fsbClient = new FSBClientImpl();
export const rtbdClient = new RTBDClientImpl();
export const genialQuaestClient = new GenialQuaestClientImpl();
