/**
 * Tier 3 Institute Clients - 20-30 Specialized Polling Institutes
 *
 * Regional, specialized, and niche polling institutes using GenericScraper
 * Profile: 0.65-0.80 reliability | Frequency: Monthly-Quarterly
 *
 * Advantages:
 * - Pure TypeScript (no Playwright)
 * - Serverless-ready (Vercel compatible)
 * - Parallel-safe
 * - ~2kb per client
 */

import { GenericScraper, GenericScraperConfig } from './generic-scraper';
import { Poll } from './institute-client-base';

// ============================================================================
// TIER 3A: TRADITIONAL REGIONAL INSTITUTES (0.72-0.78)
// ============================================================================

/**
 * IPESP - Instituto de Pesquisas Estratégicas Paulistas
 * Profile: 0.76/10 | Region: São Paulo | Frequency: Monthly
 */
export class IPESPClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'ipesp',
      instituteName: 'IPESP',
      reliabilityScore: 0.76,
      baseUrl: 'https://www.ipesp.com.br',
      patterns: {
        candidatePercentage: /([A-ZÀ-Ÿ][a-zà-ÿ\s]{2,})\s*[:\-–]\s*(\d+(?:[.,]\d+)?)\s*%/g,
      },
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * Vox Populi - Regional research institute
 * Profile: 0.74/10 | Region: MG, BA | Frequency: Bi-monthly
 */
export class VoxPopuliClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'vox-populi',
      instituteName: 'Vox Populi',
      reliabilityScore: 0.74,
      baseUrl: 'https://www.voxpopuli.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas/`;
  }
}

/**
 * Data Stratégica - Strategic data consulting
 * Profile: 0.72/10 | Frequency: Monthly
 */
export class DataEstrategicaClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'data-estrategica',
      instituteName: 'Data Estratégica',
      reliabilityScore: 0.72,
      baseUrl: 'https://www.dataestrategica.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * AGR Pesquisas - Agronomic and regional polling
 * Profile: 0.70/10 | Region: Northeast | Frequency: Monthly
 */
export class AGRPesquisasClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'agr-pesquisas',
      instituteName: 'AGR Pesquisas',
      reliabilityScore: 0.70,
      baseUrl: 'https://www.agrpesquisas.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/resultado`;
  }
}

/**
 * Cifra Pesquisas - Municipal and regional focus
 * Profile: 0.68/10 | Frequency: Monthly
 */
export class CifraPesquisasClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'cifra-pesquisas',
      instituteName: 'Cifra Pesquisas',
      reliabilityScore: 0.68,
      baseUrl: 'https://www.cifrapesquisas.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

// ============================================================================
// TIER 3B: ACADEMIC AND RESEARCH INSTITUTES (0.70-0.75)
// ============================================================================

/**
 * LAPOP - Latin American Public Opinion Project (UFRGS)
 * Profile: 0.75/10 | Region: Rio Grande do Sul | Academic
 */
export class LAPOPClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'lapop',
      instituteName: 'LAPOP',
      reliabilityScore: 0.75,
      baseUrl: 'https://www.ufrgs.br/lapop',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * CEPESP - Centro de Estudos Políticos (Fundação Getulio Vargas)
 * Profile: 0.77/10 | Academic institution
 */
export class CEPESPClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'cepesp',
      instituteName: 'CEPESP',
      reliabilityScore: 0.77,
      baseUrl: 'https://cepesp.fgv.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * Observatório de Política Exterior (UnB)
 * Profile: 0.73/10 | Academic research
 */
export class OPEClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'ope',
      instituteName: 'Observatório de Política Exterior',
      reliabilityScore: 0.73,
      baseUrl: 'https://ope.unb.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

// ============================================================================
// TIER 3C: DIGITAL AND TECH-FORWARD INSTITUTES (0.68-0.74)
// ============================================================================

/**
 * DataAgs - Agriculture and agribusiness polling
 * Profile: 0.72/10 | Sector: Agribusiness
 */
export class DataAgsClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'dataags',
      instituteName: 'DataAgs',
      reliabilityScore: 0.72,
      baseUrl: 'https://www.dataags.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/levantamentos`;
  }
}

/**
 * MDA Interior - Ministry of Agrarian Development regional polling
 * Profile: 0.68/10 | Region: Interior regions | Frequency: Quarterly
 */
export class MDAInteriorClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'mda-interior',
      instituteName: 'MDA Interior',
      reliabilityScore: 0.68,
      baseUrl: 'https://www.mda.gov.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * Paraná Pesquisas - Regional institute (Paraná, Santa Catarina)
 * Profile: 0.70/10 | Region: South
 */
export class ParanaPesquisasClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'parana-pesquisas',
      instituteName: 'Paraná Pesquisas',
      reliabilityScore: 0.70,
      baseUrl: 'https://www.paranapesquisas.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * Exitus - Electoral and political research
 * Profile: 0.69/10 | Frequency: Monthly
 */
export class ExitusClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'exitus',
      instituteName: 'Exitus',
      reliabilityScore: 0.69,
      baseUrl: 'https://www.exitus.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * Pesquisa Brasil - Open polling platform
 * Profile: 0.65/10 | Crowdsourced | Frequency: Continuous
 */
export class PesquisaBrasilClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'pesquisa-brasil',
      instituteName: 'Pesquisa Brasil',
      reliabilityScore: 0.65,
      baseUrl: 'https://www.pesquisabrasil.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

// ============================================================================
// TIER 3D: MUNICIPAL AND SPECIALIZED INSTITUTES (0.65-0.72)
// ============================================================================

/**
 * IPLANARIO - Rio de Janeiro municipal research
 * Profile: 0.68/10 | Region: Rio de Janeiro | Municipal focus
 */
export class IPLANARIOClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'iplanario',
      instituteName: 'IPLANARIO',
      reliabilityScore: 0.68,
      baseUrl: 'https://www.iplanario.rio.rj.gov.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * SEMPLA - São Paulo municipal planning and research
 * Profile: 0.70/10 | Region: São Paulo | Municipal
 */
export class SEMPLAClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'sempla',
      instituteName: 'SEMPLA',
      reliabilityScore: 0.70,
      baseUrl: 'https://www.sempla.sp.gov.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * Pesquisa Minas - Minas Gerais regional institute
 * Profile: 0.69/10 | Region: Minas Gerais
 */
export class PesquisaMinasClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'pesquisa-minas',
      instituteName: 'Pesquisa Minas',
      reliabilityScore: 0.69,
      baseUrl: 'https://www.pesquisaminas.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * Bahia Pesquisas - Bahia regional research
 * Profile: 0.67/10 | Region: Bahia
 */
export class BahiaPesquisasClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'bahia-pesquisas',
      instituteName: 'Bahia Pesquisas',
      reliabilityScore: 0.67,
      baseUrl: 'https://www.bahiapesquisas.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * Pesquisa Pernambuco - Pernambuco regional institute
 * Profile: 0.66/10 | Region: Pernambuco
 */
export class PesquisaPernambucosClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'pesquisa-pernambuco',
      instituteName: 'Pesquisa Pernambuco',
      reliabilityScore: 0.66,
      baseUrl: 'https://www.pesquisapernambuco.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

// ============================================================================
// TIER 3E: EMERGING AND NICHE INSTITUTES (0.65-0.70)
// ============================================================================

/**
 * Opinião Brasil - Rapid opinion polling
 * Profile: 0.67/10 | Frequency: Weekly | Speed-focused
 */
export class OpiniaoBrasilClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'opiniao-brasil',
      instituteName: 'Opinião Brasil',
      reliabilityScore: 0.67,
      baseUrl: 'https://www.opiniaobrasil.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * Sondagem Brasil - Quick surveys
 * Profile: 0.65/10 | Frequency: Bi-weekly
 */
export class SondagemBrasilClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'sondagem-brasil',
      instituteName: 'Sondagem Brasil',
      reliabilityScore: 0.65,
      baseUrl: 'https://www.sondagembrasil.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/sondagens`;
  }
}

/**
 * Consulta Popular - Community-based polling
 * Profile: 0.64/10 | Method: Community participation
 */
export class ConsultaPopularClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'consulta-popular',
      instituteName: 'Consulta Popular',
      reliabilityScore: 0.64,
      baseUrl: 'https://www.consultapopular.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * Monitora Brasil - Continuous monitoring platform
 * Profile: 0.66/10 | Method: Real-time tracking | Frequency: Daily
 */
export class MonitoraBrasilClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'monitora-brasil',
      instituteName: 'Monitora Brasil',
      reliabilityScore: 0.66,
      baseUrl: 'https://www.monitorabrasil.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/monitoramento`;
  }
}

/**
 * Pulse Brasil - Pulse/sentiment tracking
 * Profile: 0.65/10 | Method: Social media sentiment | Frequency: Daily
 */
export class PulseBrasilClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'pulse-brasil',
      instituteName: 'Pulse Brasil',
      reliabilityScore: 0.65,
      baseUrl: 'https://www.pulsebrasil.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pulse`;
  }
}

// ============================================================================
// TIER 3F: ENTERPRISE AND CLOSED PLATFORMS (0.70-0.76)
// ============================================================================

/**
 * Kantar IBOPE - Large media research (partial public data)
 * Profile: 0.75/10 | Frequency: Weekly | Public releases
 */
export class KantarIBOPEClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'kantar-ibope',
      instituteName: 'Kantar IBOPE',
      reliabilityScore: 0.75,
      baseUrl: 'https://www.kantarribope.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * CNT/Sensus - National confederation research
 * Profile: 0.73/10 | Frequency: Monthly
 */
export class CNTSensusClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'cnt-sensus',
      instituteName: 'CNT/Sensus',
      reliabilityScore: 0.73,
      baseUrl: 'https://www.cnt.org.br/sensus',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * Mosaico Pesquisas - Boutique research firm
 * Profile: 0.71/10 | Frequency: Monthly
 */
export class MosaicoPesquisasClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'mosaico-pesquisas',
      instituteName: 'Mosaico Pesquisas',
      reliabilityScore: 0.71,
      baseUrl: 'https://www.mosaicoesquisas.com.br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * BTG Pactual Research - Investment bank research (partial public)
 * Profile: 0.76/10 | Frequency: Quarterly
 */
export class BTGPactualClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'btg-pactual',
      instituteName: 'BTG Pactual Research',
      reliabilityScore: 0.76,
      baseUrl: 'https://www.btgpactual.com/research',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/pesquisas`;
  }
}

/**
 * Bain & Company Brazil - Strategic research (partial public)
 * Profile: 0.74/10 | Frequency: Quarterly | Strategic insights
 */
export class BainBrazilClient extends GenericScraper {
  constructor() {
    super({
      instituteId: 'bain-brazil',
      instituteName: 'Bain & Company Brazil',
      reliabilityScore: 0.74,
      baseUrl: 'https://www.bain.com/br',
    });
  }

  protected getFetchUrl(): string {
    return `${this.scraperConfig.baseUrl}/insights`;
  }
}

// ============================================================================
// SINGLETONS & REGISTRY
// ============================================================================

// TIER 3A
export const ipespClient = new IPESPClient();
export const voxPopuliClient = new VoxPopuliClient();
export const dataEstrategicaClient = new DataEstrategicaClient();
export const agrPesquisasClient = new AGRPesquisasClient();
export const cifraPesquisasClient = new CifraPesquisasClient();

// TIER 3B
export const lapopClient = new LAPOPClient();
export const cepespClient = new CEPESPClient();
export const opeClient = new OPEClient();

// TIER 3C
export const dataAgsClient = new DataAgsClient();
export const mdaInteriorClient = new MDAInteriorClient();
export const paranaPesquisasClient = new ParanaPesquisasClient();
export const exitusClient = new ExitusClient();
export const pesquisaBrasilClient = new PesquisaBrasilClient();

// TIER 3D
export const iplanarIOClient = new IPLANARIOClient();
export const semplaClient = new SEMPLAClient();
export const pesquisaMinasClient = new PesquisaMinasClient();
export const bahiaPesquisasClient = new BahiaPesquisasClient();
export const pesquisaPernambucosClient = new PesquisaPernambucosClient();

// TIER 3E
export const opiniaoBrasilClient = new OpiniaoBrasilClient();
export const sondagemBrasilClient = new SondagemBrasilClient();
export const consultaPopularClient = new ConsultaPopularClient();
export const monitoraBrasilClient = new MonitoraBrasilClient();
export const pulseBrasilClient = new PulseBrasilClient();

// TIER 3F
export const kantarIBOPEClient = new KantarIBOPEClient();
export const cntSensusClient = new CNTSensusClient();
export const mosaicoPesquisasClient = new MosaicoPesquisasClient();
export const btgPactualClient = new BTGPactualClient();
export const bainBrazilClient = new BainBrazilClient();

/**
 * All Tier 3 institutes
 * 25 total institutes across 6 sub-tiers
 */
export const tier3Clients = [
  // TIER 3A: Traditional Regional (5)
  ipespClient,
  voxPopuliClient,
  dataEstrategicaClient,
  agrPesquisasClient,
  cifraPesquisasClient,

  // TIER 3B: Academic (3)
  lapopClient,
  cepespClient,
  opeClient,

  // TIER 3C: Digital & Tech (5)
  dataAgsClient,
  mdaInteriorClient,
  paranaPesquisasClient,
  exitusClient,
  pesquisaBrasilClient,

  // TIER 3D: Municipal & Specialized (5)
  iplanarIOClient,
  semplaClient,
  pesquisaMinasClient,
  bahiaPesquisasClient,
  pesquisaPernambucosClient,

  // TIER 3E: Emerging & Niche (5)
  opiniaoBrasilClient,
  sondagemBrasilClient,
  consultaPopularClient,
  monitoraBrasilClient,
  pulseBrasilClient,

  // TIER 3F: Enterprise (5)
  kantarIBOPEClient,
  cntSensusClient,
  mosaicoPesquisasClient,
  btgPactualClient,
  bainBrazilClient,
];
