import {
  ClienteTse,
  LimitadorTaxa,
  quarentenaEmMemoria,
  tetoPadrao,
} from "../tse-cliente";

const URL_X = "https://resultados-sim.tse.jus.br/simulado/x.json";

interface RespostaFalsa {
  status: number;
  corpo?: string;
  cabecalhos?: Record<string, string>;
}

/** `fetch` falso que devolve as respostas na ordem dada e registra os cabeçalhos pedidos. */
function fetchFalso(respostas: RespostaFalsa[] | ((url: string) => RespostaFalsa)) {
  const chamadas: { url: string; headers: Record<string, string> }[] = [];
  let i = 0;
  const fn = (async (url: string | URL, init?: RequestInit) => {
    chamadas.push({
      url: String(url),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    const r = Array.isArray(respostas)
      ? (respostas[Math.min(i++, respostas.length - 1)] ?? { status: 200, corpo: "{}" })
      : respostas(String(url));
    return {
      status: r.status,
      ok: r.status >= 200 && r.status < 300,
      headers: new Headers(r.cabecalhos ?? {}),
      text: async () => r.corpo ?? "{}",
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { fn, chamadas };
}

function cliente(
  respostas: RespostaFalsa[] | ((url: string) => RespostaFalsa),
  extras: Partial<ConstructorParameters<typeof ClienteTse>[0]> = {},
) {
  const { fn, chamadas } = fetchFalso(respostas);
  const esperas: number[] = [];
  const c = new ClienteTse({
    fetchFn: fn,
    limitador: new LimitadorTaxa(1000), // sem espera real nos testes de comportamento
    quarentena: quarentenaEmMemoria(),
    dormirFn: async (ms) => {
      esperas.push(ms);
    },
    ...extras,
  });
  return { c, chamadas, esperas };
}

describe("requisição condicional", () => {
  it("manda If-None-Match e If-Modified-Since quando há estado guardado", async () => {
    const { c, chamadas } = cliente([{ status: 304 }]);
    const r = await c.buscar(URL_X, { etag: 'W/"abc"', lastModified: "Wed, 24 Sep 2026 19:12:52 GMT" });

    expect(r.resultado).toBe("304");
    expect(chamadas[0].headers["if-none-match"]).toBe('W/"abc"');
    expect(chamadas[0].headers["if-modified-since"]).toBe("Wed, 24 Sep 2026 19:12:52 GMT");
    expect(c.contadores.respostas304).toBe(1);
  });

  it("não manda cabeçalho condicional na primeira coleta", async () => {
    const { c, chamadas } = cliente([{ status: 200, corpo: '{"idg":"1"}' }]);
    await c.buscar(URL_X);
    expect(chamadas[0].headers["if-none-match"]).toBeUndefined();
    expect(chamadas[0].headers["if-modified-since"]).toBeUndefined();
  });

  it("devolve corpo, ETag e Last-Modified no 200", async () => {
    const { c } = cliente([
      {
        status: 200,
        corpo: '{"idg":"172098798"}',
        cabecalhos: { etag: 'W/"zzz"', "last-modified": "Thu, 25 Sep 2026 09:45:18 GMT" },
      },
    ]);
    const r = await c.buscar(URL_X);
    expect(r).toMatchObject({
      resultado: "200",
      corpo: { idg: "172098798" },
      etag: 'W/"zzz"',
      lastModified: "Thu, 25 Sep 2026 09:45:18 GMT",
    });
    expect(c.contadores.respostas200).toBe(1);
    expect(c.contadores.bytes).toBeGreaterThan(0);
  });

  it("JSON inválido vira erro, não exceção", async () => {
    const { c } = cliente([{ status: 200, corpo: "<html>bloqueado</html>" }]);
    const r = await c.buscar(URL_X);
    expect(r).toMatchObject({ resultado: "erro", statusHttp: 200 });
    expect((r as { mensagem: string }).mensagem).toMatch(/JSON inválido/);
    expect(c.contadores.erros).toBe(1);
  });
});

describe("circuit breaker de 404", () => {
  it("põe a URL em quarentena no primeiro 404 e não pede de novo", async () => {
    const q = quarentenaEmMemoria();
    const { c, chamadas } = cliente([{ status: 404 }], { quarentena: q });

    expect((await c.buscar(URL_X)).resultado).toBe("404");
    expect(q.urls.has(URL_X)).toBe(true);

    // Segunda tentativa: nenhuma requisição sai.
    expect((await c.buscar(URL_X)).resultado).toBe("quarentena");
    expect(chamadas).toHaveLength(1);
    expect(c.contadores.respostas404).toBe(1);
    expect(c.contadores.quarentenaEvitada).toBe(1);
  });

  it("não retenta 404 (é 404 que bloqueia o IP, não erro passageiro)", async () => {
    const { c, chamadas } = cliente([{ status: 404 }, { status: 200, corpo: "{}" }]);
    await c.buscar(URL_X);
    expect(chamadas).toHaveLength(1);
  });

  it("respeita a quarentena já persistida no banco", async () => {
    const q = quarentenaEmMemoria([URL_X]);
    const { c, chamadas } = cliente([{ status: 200, corpo: "{}" }], { quarentena: q });
    expect((await c.buscar(URL_X)).resultado).toBe("quarentena");
    expect(chamadas).toHaveLength(0);
  });

  it("liberarEmMemoria devolve a URL ao ciclo", async () => {
    const q = quarentenaEmMemoria([URL_X]);
    const { c } = cliente([{ status: 200, corpo: '{"idg":"1"}' }], { quarentena: q });
    await c.prepararQuarentena();
    expect(c.temEmQuarentena(URL_X)).toBe(true);
    c.liberarEmMemoria(URL_X);
    expect((await c.buscar(URL_X)).resultado).toBe("200");
  });
});

describe("backoff em 429/5xx", () => {
  it("retenta o 429 e respeita Retry-After", async () => {
    const { c, chamadas, esperas } = cliente([
      { status: 429, cabecalhos: { "retry-after": "2" } },
      { status: 200, corpo: '{"idg":"1"}' },
    ]);
    const r = await c.buscar(URL_X);
    expect(r.resultado).toBe("200");
    expect(chamadas).toHaveLength(2);
    expect(esperas).toEqual([2000]);
    expect(c.contadores.respostas429).toBe(1);
  });

  it("usa backoff exponencial sem Retry-After e desiste depois das tentativas", async () => {
    const { c, chamadas, esperas } = cliente([{ status: 503 }]);
    const r = await c.buscar(URL_X);
    expect(r).toMatchObject({ resultado: "erro", statusHttp: 503 });
    expect(chamadas).toHaveLength(3); // tentativas padrão
    expect(esperas).toEqual([1000, 2000]);
    expect(c.contadores.respostas5xx).toBe(3);
    expect(c.contadores.erros).toBe(1);
  });

  it("não retenta 4xx que não é 404 nem 429", async () => {
    const { c, chamadas } = cliente([{ status: 403 }]);
    expect(await c.buscar(URL_X)).toMatchObject({ resultado: "erro", statusHttp: 403 });
    expect(chamadas).toHaveLength(1);
  });

  it("conta cada tentativa como requisição (o TSE também conta)", async () => {
    const { c } = cliente([{ status: 500 }]);
    await c.buscar(URL_X);
    expect(c.contadores.requisicoes).toBe(3);
  });
});

describe("timeout", () => {
  it("aborta e retenta, devolvendo erro explícito", async () => {
    const fn = (async () => {
      const e = new Error("abortado");
      e.name = "AbortError";
      throw e;
    }) as unknown as typeof fetch;
    const c = new ClienteTse({
      fetchFn: fn,
      timeoutMs: 1234,
      limitador: new LimitadorTaxa(1000),
      quarentena: quarentenaEmMemoria(),
      dormirFn: async () => {},
    });
    const r = await c.buscar(URL_X);
    expect(r).toMatchObject({ resultado: "erro" });
    expect((r as { mensagem: string }).mensagem).toBe("timeout de 1234ms");
    expect(c.contadores.erros).toBe(1);
  });
});

describe("LimitadorTaxa", () => {
  it("não deixa passar mais que o teto em 1 segundo", async () => {
    const limitador = new LimitadorTaxa(5);
    const inicio = Date.now();
    // 6 autorizações: a 6ª só pode sair depois de a janela de 1s abrir.
    await Promise.all(Array.from({ length: 6 }, () => limitador.aguardarVez()));
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(950);
  });

  it("deixa o teto passar de uma vez quando cabe na janela", async () => {
    const limitador = new LimitadorTaxa(5);
    const inicio = Date.now();
    await Promise.all(Array.from({ length: 5 }, () => limitador.aguardarVez()));
    expect(Date.now() - inicio).toBeLessThan(200);
  });

  it("recusa teto inválido", () => {
    expect(() => new LimitadorTaxa(0)).toThrow(/inválido/);
    expect(() => new LimitadorTaxa(-1)).toThrow(/inválido/);
  });

  it("o cliente conta 304 no limitador — 304 também consome cota do TSE", async () => {
    const limitador = new LimitadorTaxa(2);
    const { fn } = fetchFalso([{ status: 304 }]);
    const c = new ClienteTse({ fetchFn: fn, limitador, quarentena: quarentenaEmMemoria() });
    const inicio = Date.now();
    for (let i = 0; i < 3; i += 1) await c.buscar(`${URL_X}?${i}`);
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(950);
    expect(c.contadores.respostas304).toBe(3);
  });
});

describe("tetoPadrao", () => {
  it("lê TSE_MAX_REQ_POR_SEG", () => {
    expect(tetoPadrao({ TSE_MAX_REQ_POR_SEG: "7" })).toBe(7);
  });

  it("cai em 5 req/s quando a variável falta ou é inválida", () => {
    expect(tetoPadrao({})).toBe(5);
    expect(tetoPadrao({ TSE_MAX_REQ_POR_SEG: "abc" })).toBe(5);
    expect(tetoPadrao({ TSE_MAX_REQ_POR_SEG: "0" })).toBe(5);
  });
});
