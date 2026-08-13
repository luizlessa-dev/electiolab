/**
 * Quaest Real Scraper Implementation
 *
 * Fetches latest polls from quaest.com.br
 *
 * Quaest Profile:
 * - Credibility: 8.5/10
 * - Frequency: 2-3x per week
 * - Known for: Presidential and gubernatorial polls
 */

import { InstituteClientBase, Poll, isRecord } from './institute-client-base';

export class QuaestClientReal extends InstituteClientBase {
  constructor() {
    super({
      instituteId: 'quaest',
      instituteName: 'Quaest',
      reliabilityScore: 0.85,
      baseUrl: 'https://quaest.com.br',
    });
  }

  /**
   * Fetch Quaest polls
   */
  async fetch(): Promise<Poll[]> {
    return this.withRetry(async () => {
      console.log('[Quaest] Fetching polls...');

      try {
        const urls = [
          `${this.baseUrl}/pesquisas`,
          `${this.baseUrl}/pesquisa`,
          `${this.baseUrl}/releases`,
          `${this.baseUrl}/noticias`,
        ];

        for (const url of urls) {
          try {
            const response = await this.fetchWithUserAgent(url);
            const html = await response.text();

            const polls = this.extractPolls(html);
            if (polls.length > 0) {
              console.log(`[Quaest] Found ${polls.length} polls from ${url}`);
              return polls;
            }
          } catch {
            console.log(`[Quaest] Failed to fetch from ${url}, trying next...`);
          }
        }

        return [];
      } catch (error) {
        console.error('[Quaest] Fetch error:', error);
        return [];
      }
    }, 'Quaest fetch');
  }

  /**
   * Extract polls from Quaest HTML
   *
   * Quaest structure:
   * - <article class="poll-card">
   * - <h3>Poll title</h3>
   * - <ul><li>Candidate: XX%</li></ul>
   * - <time>DD/MM/YYYY</time>
   */
  private extractPolls(html: string): Poll[] {
    const polls: Poll[] = [];

    // Pattern 1: JSON API response in page
    const jsonPattern = /window\.__initialState__\s*=\s*({[\s\S]*?});/;
    const jsonMatch = html.match(jsonPattern);

    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const extracted = this.parseQuaestJSON(data);
        if (extracted.length > 0) {
          return extracted;
        }
      } catch {
        console.warn('[Quaest] JSON parse failed, trying HTML extraction');
      }
    }

    // Pattern 2: Extract from article elements
    const articlePattern = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    let match;

    while ((match = articlePattern.exec(html))) {
      const articleHtml = match[1];

      // Skip if not a poll article
      if (!articleHtml.includes('candidat') && !articleHtml.includes('vot')) {
        continue;
      }

      // Extract poll data
      try {
        const poll = this.extractPollFromArticle(articleHtml);
        if (poll && poll.results.length > 0) {
          polls.push(poll);
        }
      } catch {
        console.warn('[Quaest] Failed to parse article');
      }
    }

    return polls;
  }

  /**
   * Extract poll from article HTML
   */
  private extractPollFromArticle(html: string): Poll | null {
    try {
      // Extract date
      const dateMatch = html.match(/<time[^>]*datetime="([^"]*)"[^>]*>/);

      // Extract candidates and percentages
      const results: Poll['results'] = [];

      // Try list items
      const listPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let listMatch;

      while ((listMatch = listPattern.exec(html))) {
        const li = listMatch[1];
        const parts = li.split(/:/).map(p => p.trim());

        if (parts.length >= 2) {
          const name = parts[0].replace(/<[^>]*>/g, '').trim();
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
        id: `quaest-${Date.now()}-${Math.random()}`,
        publishDate: dateMatch ? new Date(dateMatch[1]) : new Date(),
        fieldworkEnd: dateMatch ? new Date(dateMatch[1]) : new Date(),
        sampleSize: 1000,
        methodology: 'presencial',
        results,
        sourceUrl: this.baseUrl,
      });
    } catch {
      return null;
    }
  }

  /**
   * Parse Quaest JSON structure
   */
  private parseQuaestJSON(data: unknown): Poll[] {
    const polls: Poll[] = [];
    if (!isRecord(data)) return polls;

    const pollsArray = data.polls || data.pesquisas || data.results || [];

    if (!Array.isArray(pollsArray)) {
      return [];
    }

    for (const rawPoll of pollsArray) {
      if (!isRecord(rawPoll)) continue;

      try {
        const poll = this.normalizePoll({
          id: String(rawPoll.id || `quaest-${Date.now()}-${Math.random()}`),
          publishDate: new Date((rawPoll.publishedAt || rawPoll.publication_date || new Date()) as string | number | Date),
          fieldworkEnd: new Date((rawPoll.fieldworkEnd || rawPoll.data_fim || new Date()) as string | number | Date),
          sampleSize: parseInt(String(rawPoll.sampleSize || rawPoll.amostra || 0)),
          methodology: this.normalizeMethodology(rawPoll.methodology as string | undefined),
          marginOfError: this.parseMoE(rawPoll.marginOfError as string | number | undefined),
          results: this.parseResults(rawPoll.results || rawPoll.candidatos || []),
          sourceUrl: (rawPoll.url as string | undefined) || this.baseUrl,
        });

        if (poll.sampleSize > 0 && poll.results.length > 0) {
          polls.push(poll);
        }
      } catch (error) {
        console.warn('[Quaest] Parse error:', error);
      }
    }

    return polls;
  }

  /**
   * Parse results
   */
  private parseResults(results: unknown): Poll['results'] {
    if (!Array.isArray(results)) return [];

    return results
      .map(r => {
        if (!isRecord(r)) return null;

        const name = String(r.candidateName || r.name || r.candidate || '');
        const percentage = parseFloat(String(r.percentage || r.pct || '0'));

        if (!name || percentage < 0) return null;

        return {
          candidateName: name,
          candidateId: name.toLowerCase().replace(/\s+/g, '-'),
          percentage,
        };
      })
      .filter(Boolean) as Poll['results'];
  }

  /**
   * Normalize methodology
   */
  private normalizeMethodology(
    method?: string
  ): 'presencial' | 'telefonica' | 'mista' | 'online' {
    if (!method) return 'presencial';
    const lower = String(method).toLowerCase();
    if (lower.includes('presencial')) return 'presencial';
    if (lower.includes('telefone')) return 'telefonica';
    if (lower.includes('mist')) return 'mista';
    if (lower.includes('online')) return 'online';
    return 'presencial';
  }

  /**
   * Parse margin of error
   */
  private parseMoE(moe?: string | number): number | undefined {
    if (!moe) return undefined;
    const value = typeof moe === 'string' ? parseFloat(moe) : moe;
    return isNaN(value) ? undefined : value;
  }
}

// Export singleton
export const quaestClientReal = new QuaestClientReal();
