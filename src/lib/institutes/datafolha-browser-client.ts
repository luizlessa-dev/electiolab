/**
 * Datafolha Browser-Based Scraper
 *
 * Uses Playwright to render React SPA and extract poll data
 * from dynamic content.
 */

import { BrowserScraperBase } from './browser-scraper-base';
import { Poll } from './institute-client-base';

export class DatafolhaBrowserClient extends BrowserScraperBase {
  constructor() {
    super({
      instituteId: 'datafolha',
      instituteName: 'Datafolha',
      reliabilityScore: 0.92,
      baseUrl: 'https://datafolha.folha.uol.com.br/eleicoes/2026/',
      pollSelectors: {
        container: '[data-poll], .poll, .pesquisa',
        date: '[data-date], .poll-date, time',
        candidates: '.candidate, .candidato, [data-candidate]',
        percentage: '.percentage, .pct, [data-pct]',
      },
    });
  }

  /**
   * Extract polls from rendered HTML
   */
  protected extractPollsFromHTML(html: string): Poll[] {
    const polls: Poll[] = [];

    // Try JSON first (may be in rendered page)
    const jsonPattern = /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/;
    const jsonMatch = html.match(jsonPattern);

    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const extracted = this.parseJSON(data);
        if (extracted.length > 0) {
          return extracted;
        }
      } catch {
        console.warn('[Datafolha Browser] JSON parse failed');
      }
    }

    // Fallback: HTML extraction
    const pollDivs = html.match(/(?:<div[^>]*poll[^>]*>[\s\S]*?<\/div>)/gi) || [];

    for (const pollDiv of pollDivs.slice(0, 5)) {
      try {
        const poll = this.extractPollFromDiv(pollDiv);
        if (poll && poll.results.length > 0) {
          polls.push(poll);
        }
      } catch {
        // Skip invalid polls
      }
    }

    return polls;
  }

  /**
   * Extract single poll from div
   */
  private extractPollFromDiv(html: string): Poll | null {
    try {
      // Extract date
      const dateMatch = html.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      const date = dateMatch
        ? new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]))
        : new Date();

      // Extract candidates
      const results: Poll['results'] = [];
      const candPattern = /(?:<span|<div)[^>]*class="[^"]*candidat[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/gi;
      let candMatch;

      while ((candMatch = candPattern.exec(html))) {
        const candText = candMatch[1].replace(/<[^>]*>/g, '').trim();
        const parts = candText.split(/[:\-]/);

        if (parts.length >= 2) {
          const name = parts[0].trim();
          const percentStr = parts[1].match(/(\d+(?:\.\d+)?)/);

          if (percentStr && name) {
            results.push({
              candidateName: name,
              candidateId: name.toLowerCase().replace(/\s+/g, '-'),
              percentage: parseFloat(percentStr[1]),
            });
          }
        }
      }

      if (results.length === 0) return null;

      return this.normalizePoll({
        id: `df-browser-${Date.now()}-${Math.random()}`,
        publishDate: date,
        fieldworkEnd: date,
        sampleSize: 2000,
        methodology: 'presencial',
        results,
        sourceUrl: this.config.baseUrl,
      });
    } catch {
      return null;
    }
  }

  /**
   * Parse JSON structure
   */
  private parseJSON(data: any): Poll[] {
    const polls: Poll[] = [];
    const pollsArray = data.pesquisas || data.polls || [];

    if (!Array.isArray(pollsArray)) return [];

    for (const rawPoll of pollsArray.slice(0, 5)) {
      try {
        const poll = this.normalizePoll({
          id: rawPoll.id || `df-${Date.now()}`,
          publishDate: new Date(rawPoll.data_publicacao || new Date()),
          fieldworkEnd: new Date(rawPoll.data_fim || new Date()),
          sampleSize: parseInt(String(rawPoll.tamanho_amostra || 2000)),
          methodology: 'presencial',
          marginOfError: parseFloat(String(rawPoll.margem_erro || 2.2)),
          results: this.parseResults(rawPoll.resultados || []),
          sourceUrl: this.config.baseUrl,
        });

        if (poll.sampleSize > 0 && poll.results.length > 0) {
          polls.push(poll);
        }
      } catch {
        // Skip invalid
      }
    }

    return polls;
  }

  /**
   * Parse results array
   */
  private parseResults(results: any[]): Poll['results'] {
    if (!Array.isArray(results)) return [];

    return results
      .map(r => {
        if (!r || typeof r !== 'object') return null;
        const name = String(r.candidato_nome || r.nome || '');
        const pct = parseFloat(String(r.percentual || r.pct || '0'));
        if (!name || pct <= 0) return null;

        return {
          candidateName: name,
          candidateId: name.toLowerCase().replace(/\s+/g, '-'),
          percentage: pct,
        };
      })
      .filter(Boolean) as Poll['results'];
  }
}

export const datafolhaBrowserClient = new DatafolhaBrowserClient();
