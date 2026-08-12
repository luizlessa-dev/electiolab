/**
 * Ipec Real Scraper Implementation
 *
 * Fetches latest polls from ictouch.com.br/pesquisa
 *
 * Ipec Profile:
 * - Credibility: 8.8/10
 * - Frequency: 2-3x per week
 * - Known for: Gubernatorial elections
 */

import { InstituteClientBase, Poll } from './institute-client-base';

export class IpecClientReal extends InstituteClientBase {
  constructor() {
    super({
      instituteId: 'ipec',
      instituteName: 'Ipec',
      reliabilityScore: 0.88,
      baseUrl: 'https://ictouch.com.br',
    });
  }

  /**
   * Fetch Ipec polls
   */
  async fetch(): Promise<Poll[]> {
    return this.withRetry(async () => {
      console.log('[Ipec] Fetching polls...');

      try {
        // Try main Ipec URL
        const urls = [
          `${this.baseUrl}/pesquisa`,
          `${this.baseUrl}/pesquisas`,
          `${this.baseUrl}/releases`,
        ];

        for (const url of urls) {
          try {
            const response = await this.fetchWithUserAgent(url);
            const html = await response.text();

            const polls = this.extractPolls(html);
            if (polls.length > 0) {
              console.log(`[Ipec] Found ${polls.length} polls from ${url}`);
              return polls;
            }
          } catch {
            console.log(`[Ipec] Failed to fetch from ${url}, trying next...`);
          }
        }

        return [];
      } catch (error) {
        console.error('[Ipec] Fetch error:', error);
        return [];
      }
    }, 'Ipec fetch');
  }

  /**
   * Extract polls from Ipec HTML
   *
   * Ipec structure:
   * - <div class="poll-item">
   * - <span class="candidate">Name</span>
   * - <span class="percentage">XX%</span>
   * - <span class="date">DD/MM/YYYY</span>
   */
  private extractPolls(html: string): Poll[] {
    const polls: Poll[] = [];

    // Pattern 1: JSON in script tags
    const jsonPattern = /<script[^>]*>.*?window\.__POLLS__\s*=\s*({[\s\S]*?});.*?<\/script>/;
    const jsonMatch = html.match(jsonPattern);

    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const extracted = this.parseIPecJSON(data);
        if (extracted.length > 0) {
          return extracted;
        }
      } catch {
        console.warn('[Ipec] JSON parse failed, trying HTML extraction');
      }
    }

    // Pattern 2: HTML divs with poll data
    const pollDivPattern = /<div[^>]*class="[^"]*poll[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let match;

    while ((match = pollDivPattern.exec(html))) {
      const pollHtml = match[1];

      // Extract candidate data
      const candidates: Poll['results'] = [];
      const candidatePattern = /<span[^>]*class="[^"]*candidate[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;

      let candMatch;
      while ((candMatch = candidatePattern.exec(pollHtml))) {
        const candText = candMatch[1].replace(/<[^>]*>/g, '').trim();
        const percentPattern = /(\d+(?:\.\d+)?)\s*%?/;
        const percentMatch = candText.match(percentPattern);

        if (percentMatch) {
          candidates.push({
            candidateName: candText.split(/\d+/)[0].trim(),
            candidateId: candText.toLowerCase().replace(/\s+/g, '-'),
            percentage: parseFloat(percentMatch[1]),
          });
        }
      }

      if (candidates.length > 0) {
        const poll = this.normalizePoll({
          id: `ipec-${Date.now()}-${Math.random()}`,
          publishDate: new Date(),
          fieldworkEnd: new Date(),
          sampleSize: 1000,
          methodology: 'presencial',
          results: candidates,
          sourceUrl: this.baseUrl,
        });
        polls.push(poll);
      }
    }

    return polls;
  }

  /**
   * Parse Ipec JSON structure
   */
  private parseIPecJSON(data: any): Poll[] {
    const polls: Poll[] = [];
    const pollsArray = data.polls || data.pesquisas || data.results || [];

    if (!Array.isArray(pollsArray)) {
      return [];
    }

    for (const rawPoll of pollsArray) {
      try {
        const poll = this.normalizePoll({
          id: rawPoll.id || `ipec-${Date.now()}-${Math.random()}`,
          publishDate: new Date(rawPoll.publishedAt || rawPoll.data_publicacao || new Date()),
          fieldworkEnd: new Date(rawPoll.fieldworkEndDate || rawPoll.data_fim || new Date()),
          sampleSize: parseInt(String(rawPoll.sampleSize || rawPoll.amostra || 0)),
          methodology: this.normalizeMethodology(rawPoll.methodology || 'presencial'),
          marginOfError: this.parseMoE(rawPoll.marginOfError || rawPoll.moe),
          results: this.parseResults(rawPoll.results || rawPoll.candidatos || []),
          sourceUrl: rawPoll.source_url || this.baseUrl,
        });

        if (poll.sampleSize > 0 && poll.results.length > 0) {
          polls.push(poll);
        }
      } catch (error) {
        console.warn('[Ipec] Parse error:', error);
      }
    }

    return polls;
  }

  /**
   * Parse results
   */
  private parseResults(results: any[]): Poll['results'] {
    if (!Array.isArray(results)) return [];

    return results
      .map(r => {
        if (typeof r !== 'object' || !r) return null;

        const name = String(r.candidateName || r.name || '');
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
export const ipecClientReal = new IpecClientReal();
