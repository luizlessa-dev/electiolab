import type { SupabaseClient } from "@supabase/supabase-js";
import { RepositorioApuracao } from "../repositorio";

/**
 * Espiã do construtor de consultas do supabase-js: registra a tabela, as colunas e os
 * filtros aplicados. Não simula o PostgREST — só verifica o que o repositório pede.
 */
function supabaseEspiao(dados: Record<string, unknown>[] = []) {
  const consultas: {
    tabela: string;
    colunas?: string;
    payload?: unknown;
    filtros: { op: string; coluna: string; valor: unknown }[];
  }[] = [];

  const construtor = (tabela: string) => {
    const atual = {
      tabela,
      colunas: undefined as string | undefined,
      payload: undefined as unknown,
      filtros: [] as { op: string; coluna: string; valor: unknown }[],
    };
    consultas.push(atual);
    const q: Record<string, unknown> = {
      select(colunas: string) {
        atual.colunas = colunas;
        return q;
      },
      eq(coluna: string, valor: unknown) {
        atual.filtros.push({ op: "eq", coluna, valor });
        return q;
      },
      in(coluna: string, valor: unknown) {
        atual.filtros.push({ op: "in", coluna, valor });
        return q;
      },
      upsert(payload: unknown) {
        atual.payload = payload;
        return q;
      },
      single() {
        return {
          then(resolve: (v: unknown) => void) {
            resolve({ data: dados[0] ?? null, error: null });
          },
        };
      },
      order() {
        return q;
      },
      limit() {
        return q;
      },
      then(resolve: (v: unknown) => void) {
        resolve({ data: dados, error: null });
      },
    };
    return q;
  };

  const sb = { from: construtor } as unknown as SupabaseClient;
  return { sb, consultas };
}

describe("consultas em apuracao.acompanhamento", () => {
  // Regressão: a tabela tem ~5.700 linhas `mun` por eleição (os municípios vêm de
  // carona no EA15) e o PostgREST corta a resposta em 1.000 linhas. Sem o filtro, o 2º
  // ciclo montava 28 alvos EA20 em vez de 83 — e sem nenhum erro aparente.
  it("estadosAcompanhamento pede só br e uf", async () => {
    const { sb, consultas } = supabaseEspiao();
    const repo = new RepositorioApuracao(sb, sb);
    await repo.estadosAcompanhamento(1);

    expect(consultas).toHaveLength(1);
    expect(consultas[0].tabela).toBe("acompanhamento");
    expect(consultas[0].filtros).toEqual([
      { op: "eq", coluna: "eleicao_id", valor: 1 },
      { op: "in", coluna: "tipo_abrangencia", valor: ["br", "uf"] },
    ]);
  });

  it("abrangenciasConhecidas pede só br e uf", async () => {
    const { sb, consultas } = supabaseEspiao();
    const repo = new RepositorioApuracao(sb, sb);
    await repo.abrangenciasConhecidas(1);

    expect(consultas[0].tabela).toBe("acompanhamento");
    expect(consultas[0].filtros).toEqual([
      { op: "eq", coluna: "eleicao_id", valor: 1 },
      { op: "in", coluna: "tipo_abrangencia", valor: ["br", "uf"] },
    ]);
    // A lista de alvos precisa do tipo e da UF de cada abrangência.
    expect(consultas[0].colunas).toContain("tipo_abrangencia");
    expect(consultas[0].colunas).toContain("uf");
  });

  it("devolve o estado indexado por abrangência", async () => {
    const { sb } = supabaseEspiao([
      { abrangencia: "br", idg: "172098675", etag: 'W/"a"' },
      { abrangencia: "mg", idg: "172292266", etag: null },
    ]);
    const repo = new RepositorioApuracao(sb, sb);
    const estados = await repo.estadosAcompanhamento(1);

    expect(estados.get("br")).toEqual({ idg: "172098675", etag: 'W/"a"', lastModified: null });
    expect(estados.get("mg")?.etag).toBeNull();
    expect(estados.has("ac")).toBe(false);
  });
});

describe("mapaElections", () => {
  it("indexa por type|state|round, com state vazio no presidente", async () => {
    const { sb } = supabaseEspiao([
      { id: "u1", type: "presidente", state: null, round: 1 },
      { id: "u2", type: "governador", state: "MG", round: 1 },
    ]);
    const repo = new RepositorioApuracao(sb, sb);
    const mapa = await repo.mapaElections(2026);

    expect(mapa.get("presidente||1")).toBe("u1");
    expect(mapa.get("governador|MG|1")).toBe("u2");
  });
});

describe("mapaCargoTipo", () => {
  it("traduz código de cargo do TSE para elections.type", async () => {
    const { sb } = supabaseEspiao([
      { codigo_cargo: 1, elections_type: "presidente" },
      { codigo_cargo: 5, elections_type: "senador" },
    ]);
    const repo = new RepositorioApuracao(sb, sb);
    const mapa = await repo.mapaCargoTipo();

    expect(mapa.get(1)).toBe("presidente");
    expect(mapa.get(5)).toBe("senador");
  });
});

describe("upsertDisputa", () => {
  // Regressão: `vagas`/`quociente_eleitoral` vêm do EA20, lido depois. O ciclo abre
  // gravando a disputa para conseguir o id do ETag; se mandasse essas colunas como null,
  // apagaria o que o ciclo anterior gravou (foi o que aconteceu: `vagas` virou null no
  // 2º ciclo real). O upsert do PostgREST só escreve as colunas do payload, então elas
  // ficam de fora quando ainda não se sabe o valor.
  it("aceita payload sem vagas nem quociente_eleitoral", async () => {
    const { sb } = supabaseEspiao([{ id: 7 }]);
    const repo = new RepositorioApuracao(sb, sb);
    const id = await repo.upsertDisputa({
      eleicao_id: 1,
      cargo_id: 2,
      abrangencia: "mg",
      tipo_abrangencia: "uf",
      uf: "mg",
      municipio_codigo: null,
      election_id: null,
    });
    expect(id).toBe(7);
  });
});
