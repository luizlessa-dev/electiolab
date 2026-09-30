/**
 * Cliente HTTP para os arquivos de divulgação do TSE.
 *
 * Obrigações que este módulo carrega (`apuracao-2026/CLAUDE.md`):
 *  - regra 2: teto global de requisições por segundo (respostas 304 também contam);
 *  - regra 3: **zero 404 por descuido** → circuit breaker que põe a URL em quarentena
 *    no primeiro 404 e só volta a pedi-la quando a config/acompanhamento liberar;
 *  - regra 5: **sempre** requisição condicional (`If-None-Match` / `If-Modified-Since`),
 *    gravando ETag e Last-Modified.
 *
 * Mais timeout e backoff em 429/5xx. O limitador é **global do processo** (singleton),
 * para que nenhum módulo consiga furar o teto abrindo seu próprio cliente.
 */

/** Porta de persistência da quarentena de 404 (implementação real em `repositorio.ts`). */
export interface PortaQuarentena {
  /** URLs atualmente em quarentena (consultado uma vez por ciclo e mantido em memória). */
  carregar(): Promise<Set<string>>;
  /** Registra/renova a quarentena de uma URL. */
  registrar(url: string, statusHttp: number): Promise<void>;
}

/** Quarentena em memória — usada nos testes e quando não há banco. */
export function quarentenaEmMemoria(inicial: Iterable<string> = []): PortaQuarentena & {
  urls: Set<string>;
} {
  const urls = new Set(inicial);
  return {
    urls,
    async carregar() {
      return new Set(urls);
    },
    async registrar(url) {
      urls.add(url);
    },
  };
}

export interface ContadoresTse {
  requisicoes: number;
  respostas200: number;
  respostas304: number;
  respostas404: number;
  respostas429: number;
  respostas5xx: number;
  erros: number;
  quarentenaEvitada: number;
  bytes: number;
}

export function contadoresZerados(): ContadoresTse {
  return {
    requisicoes: 0,
    respostas200: 0,
    respostas304: 0,
    respostas404: 0,
    respostas429: 0,
    respostas5xx: 0,
    erros: 0,
    quarentenaEvitada: 0,
    bytes: 0,
  };
}

export interface CondicionalTse {
  etag?: string | null;
  lastModified?: string | null;
}

export type RespostaTse =
  | {
      resultado: "200";
      corpo: unknown;
      etag: string | null;
      lastModified: string | null;
      bytes: number;
    }
  /** Não mudou desde o ETag/Last-Modified enviado — nada a gravar. */
  | { resultado: "304" }
  /** 404: a URL entrou em quarentena. */
  | { resultado: "404" }
  /** Já estava em quarentena: nenhuma requisição foi feita. */
  | { resultado: "quarentena" }
  | { resultado: "erro"; mensagem: string; statusHttp?: number };

// ---------------------------------------------------------------------------
// Limitador global de taxa
// ---------------------------------------------------------------------------

/**
 * Janela deslizante de 1 s: nunca mais de `reqPorSegundo` **inícios** de requisição
 * em qualquer segundo. Simples e conservador — é um teto, não uma média.
 */
export class LimitadorTaxa {
  private readonly inicios: number[] = [];
  private fila: Promise<void> = Promise.resolve();

  constructor(private reqPorSegundo: number) {
    if (!Number.isFinite(reqPorSegundo) || reqPorSegundo <= 0) {
      throw new Error(`Teto de requisições por segundo inválido: ${reqPorSegundo}`);
    }
  }

  get teto(): number {
    return this.reqPorSegundo;
  }

  ajustarTeto(reqPorSegundo: number): void {
    if (!Number.isFinite(reqPorSegundo) || reqPorSegundo <= 0) {
      throw new Error(`Teto de requisições por segundo inválido: ${reqPorSegundo}`);
    }
    this.reqPorSegundo = reqPorSegundo;
  }

  /** Serializa a *autorização* (não a requisição): os GETs seguem em paralelo. */
  async aguardarVez(): Promise<void> {
    const minha = this.fila.then(() => this.reservar());
    // Evita que uma rejeição na cadeia derrube as reservas seguintes.
    this.fila = minha.catch(() => undefined);
    return minha;
  }

  private async reservar(): Promise<void> {
    for (;;) {
      const agora = Date.now();
      while (this.inicios.length > 0 && agora - this.inicios[0] >= 1000) {
        this.inicios.shift();
      }
      if (this.inicios.length < this.reqPorSegundo) {
        this.inicios.push(agora);
        return;
      }
      const esperar = 1000 - (agora - this.inicios[0]) + 1;
      await dormir(esperar);
    }
  }
}

export function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.max(0, ms)));
}

/** Teto padrão: `TSE_MAX_REQ_POR_SEG` ou 5 req/s (20× abaixo dos 100/s documentados). */
export function tetoPadrao(env: Record<string, string | undefined> = process.env): number {
  const bruto = env.TSE_MAX_REQ_POR_SEG;
  const n = bruto ? Number(bruto) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 5;
}

let limitadorGlobal: LimitadorTaxa | undefined;

/** Limitador compartilhado por todo o processo. */
export function limitadorCompartilhado(): LimitadorTaxa {
  if (!limitadorGlobal) limitadorGlobal = new LimitadorTaxa(tetoPadrao());
  return limitadorGlobal;
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

export interface OpcoesClienteTse {
  timeoutMs?: number;
  /** Tentativas totais por URL em 429/5xx/erro de rede (inclui a primeira). */
  tentativas?: number;
  limitador?: LimitadorTaxa;
  quarentena?: PortaQuarentena;
  fetchFn?: typeof fetch;
  /** Só para teste: substitui a espera do backoff. */
  dormirFn?: (ms: number) => Promise<void>;
  aoRegistrar?: (linha: string) => void;
}

const USER_AGENT = "electiolab-apuracao/1.0 (+https://electiolab.com)";

export class ClienteTse {
  readonly contadores: ContadoresTse = contadoresZerados();
  private readonly timeoutMs: number;
  private readonly tentativas: number;
  private readonly limitador: LimitadorTaxa;
  private readonly quarentena: PortaQuarentena;
  private readonly fetchFn: typeof fetch;
  private readonly dormirFn: (ms: number) => Promise<void>;
  private readonly aoRegistrar?: (linha: string) => void;
  private emQuarentena = new Set<string>();
  private quarentenaCarregada = false;

  constructor(opcoes: OpcoesClienteTse = {}) {
    this.timeoutMs = opcoes.timeoutMs ?? 15_000;
    this.tentativas = opcoes.tentativas ?? 3;
    this.limitador = opcoes.limitador ?? limitadorCompartilhado();
    this.quarentena = opcoes.quarentena ?? quarentenaEmMemoria();
    this.fetchFn = opcoes.fetchFn ?? fetch;
    this.dormirFn = opcoes.dormirFn ?? dormir;
    this.aoRegistrar = opcoes.aoRegistrar;
  }

  /** Carrega a quarentena do banco uma vez por ciclo. */
  async prepararQuarentena(): Promise<void> {
    this.emQuarentena = await this.quarentena.carregar();
    this.quarentenaCarregada = true;
  }

  /** Remove a URL da quarentena em memória (a config/acompanhamento indicou que existe). */
  liberarEmMemoria(url: string): void {
    this.emQuarentena.delete(url);
  }

  temEmQuarentena(url: string): boolean {
    return this.emQuarentena.has(url);
  }

  /**
   * GET condicional. Devolve `304` quando o arquivo não mudou, `404` (com quarentena)
   * quando não existe, e `erro` quando esgotou as tentativas — nunca lança por
   * problema de rede, para que um arquivo ruim não derrube o ciclo.
   */
  async buscar(url: string, condicional: CondicionalTse = {}): Promise<RespostaTse> {
    if (!this.quarentenaCarregada) await this.prepararQuarentena();

    if (this.emQuarentena.has(url)) {
      this.contadores.quarentenaEvitada += 1;
      return { resultado: "quarentena" };
    }

    let ultimoErro = "";
    for (let tentativa = 1; tentativa <= this.tentativas; tentativa += 1) {
      await this.limitador.aguardarVez();

      const cabecalhos: Record<string, string> = {
        "user-agent": USER_AGENT,
        accept: "application/json",
      };
      if (condicional.etag) cabecalhos["if-none-match"] = condicional.etag;
      if (condicional.lastModified) cabecalhos["if-modified-since"] = condicional.lastModified;

      this.contadores.requisicoes += 1;
      const controle = new AbortController();
      const relogio = setTimeout(() => controle.abort(), this.timeoutMs);
      try {
        const resposta = await this.fetchFn(url, {
          headers: cabecalhos,
          signal: controle.signal,
          redirect: "follow",
        });
        clearTimeout(relogio);

        if (resposta.status === 304) {
          this.contadores.respostas304 += 1;
          this.registrar(`304 ${url}`);
          return { resultado: "304" };
        }

        if (resposta.status === 404) {
          this.contadores.respostas404 += 1;
          this.emQuarentena.add(url);
          await this.quarentena.registrar(url, 404);
          this.registrar(`404 ${url} — em quarentena`);
          return { resultado: "404" };
        }

        if (resposta.status === 429 || resposta.status >= 500) {
          if (resposta.status === 429) this.contadores.respostas429 += 1;
          else this.contadores.respostas5xx += 1;
          ultimoErro = `HTTP ${resposta.status}`;
          // Descarta o corpo para liberar a conexão.
          await resposta.arrayBuffer().catch(() => undefined);
          if (tentativa < this.tentativas) {
            await this.dormirFn(this.esperaBackoff(tentativa, resposta.headers.get("retry-after")));
            continue;
          }
          this.contadores.erros += 1;
          this.registrar(`${resposta.status} ${url} — desistindo`);
          return { resultado: "erro", mensagem: ultimoErro, statusHttp: resposta.status };
        }

        if (!resposta.ok) {
          this.contadores.erros += 1;
          await resposta.arrayBuffer().catch(() => undefined);
          this.registrar(`${resposta.status} ${url}`);
          return {
            resultado: "erro",
            mensagem: `HTTP ${resposta.status}`,
            statusHttp: resposta.status,
          };
        }

        const bruto = await resposta.text();
        this.contadores.respostas200 += 1;
        this.contadores.bytes += Buffer.byteLength(bruto);
        let corpo: unknown;
        try {
          corpo = JSON.parse(bruto);
        } catch (e) {
          this.contadores.erros += 1;
          return {
            resultado: "erro",
            mensagem: `JSON inválido em ${url}: ${(e as Error).message}`,
            statusHttp: 200,
          };
        }
        this.registrar(`200 ${url} (${Buffer.byteLength(bruto)} bytes)`);
        return {
          resultado: "200",
          corpo,
          etag: resposta.headers.get("etag"),
          lastModified: resposta.headers.get("last-modified"),
          bytes: Buffer.byteLength(bruto),
        };
      } catch (e) {
        clearTimeout(relogio);
        const mensagem =
          (e as Error).name === "AbortError"
            ? `timeout de ${this.timeoutMs}ms`
            : (e as Error).message;
        ultimoErro = mensagem;
        if (tentativa < this.tentativas) {
          await this.dormirFn(this.esperaBackoff(tentativa, null));
          continue;
        }
        this.contadores.erros += 1;
        this.registrar(`ERRO ${url} — ${mensagem}`);
        return { resultado: "erro", mensagem };
      }
    }

    this.contadores.erros += 1;
    return { resultado: "erro", mensagem: ultimoErro || "tentativas esgotadas" };
  }

  /** Backoff exponencial (1s, 2s, 4s…), respeitando `Retry-After` quando vem. */
  private esperaBackoff(tentativa: number, retryAfter: string | null): number {
    if (retryAfter) {
      const segundos = Number(retryAfter);
      if (Number.isFinite(segundos) && segundos >= 0) return Math.min(segundos * 1000, 60_000);
      const data = Date.parse(retryAfter);
      if (!Number.isNaN(data)) return Math.min(Math.max(data - Date.now(), 0), 60_000);
    }
    return Math.min(1000 * 2 ** (tentativa - 1), 30_000);
  }

  private registrar(linha: string): void {
    this.aoRegistrar?.(linha);
  }
}
