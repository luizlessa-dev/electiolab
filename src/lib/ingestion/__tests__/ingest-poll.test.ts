/**
 * Testes do pipeline de ingestão (ingestPoll) — Etapa 28.
 *
 * Todo o acesso ao Supabase é mockado localmente (ver `createMockSupabase`
 * abaixo). Nenhum teste aqui conecta a um banco real nem depende de
 * credenciais.
 */

import { ingestPoll } from "../ingest-poll";
import { createClient } from "@/lib/supabase/server";
import type { PollIngestionPayload } from "../types";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

type MockState = {
  elections?: Record<string, { id: string }>;
  institutes?: Record<string, { id: string }>;
  existingPolls?: Array<{
    election_id: string;
    institute_id: string;
    fieldwork_end: string;
    id: string;
  }>;
  candidates?: Array<{ id: string; name: string; election_id: string; is_active?: boolean }>;
  pollInsertId?: string;
  pollInsertError?: { message: string } | null;
  pollResultsInsertError?: { message: string } | null;
  pollDeleteError?: { message: string } | null;
};

/**
 * Query builder falso mínimo o suficiente pra cobrir exatamente as chamadas
 * que ingest-poll.ts faz (from/select/eq/limit/single/insert/delete), sem
 * reimplementar o PostgREST. Cada chamada a `.from(table)` cria um builder
 * novo e independente; o resultado só é computado quando o builder é
 * `await`ado (via `.then`), igual ao client real do supabase-js.
 */
function createMockSupabase(state: MockState) {
  const calls = {
    pollInserts: [] as unknown[],
    pollResultsInserts: [] as unknown[],
    pollDeletes: [] as string[],
    candidateQueries: [] as string[],
  };

  function from(table: string) {
    const filters: Record<string, unknown> = {};
    let op: "select" | "insert" | "delete" = "select";
    let insertPayload: unknown = null;

    const builder: PromiseLike<{ data: unknown; error: { message: string } | null }> & {
      select: (cols: string) => typeof builder;
      eq: (col: string, val: unknown) => typeof builder;
      limit: (n: number) => typeof builder;
      single: () => typeof builder;
      insert: (payload: unknown) => typeof builder;
      delete: () => typeof builder;
    } = {
      select() {
        return builder;
      },
      eq(col, val) {
        filters[col] = val;
        return builder;
      },
      limit() {
        return builder;
      },
      single() {
        return builder;
      },
      insert(payload) {
        op = "insert";
        insertPayload = payload;
        return builder;
      },
      delete() {
        op = "delete";
        return builder;
      },
      then(resolve, reject) {
        return Promise.resolve(execute()).then(resolve, reject);
      },
    };

    function execute(): { data: unknown; error: { message: string } | null } {
      if (table === "elections" && op === "select") {
        const row = (state.elections ?? {})[filters.name as string];
        return row ? { data: row, error: null } : { data: null, error: { message: "not found" } };
      }

      if (table === "institutes" && op === "select") {
        const row = (state.institutes ?? {})[filters.name as string];
        return row ? { data: row, error: null } : { data: null, error: { message: "not found" } };
      }

      if (table === "polls" && op === "select") {
        const match = (state.existingPolls ?? []).find(
          (p) =>
            p.election_id === filters.election_id &&
            p.institute_id === filters.institute_id &&
            p.fieldwork_end === filters.fieldwork_end
        );
        return match
          ? { data: { id: match.id }, error: null }
          : { data: null, error: { message: "not found" } };
      }

      if (table === "candidates" && op === "select") {
        calls.candidateQueries.push(filters.election_id as string);
        // Simula o filtro do PostgREST: só restringe por is_active se a
        // implementação de fato enviar `.eq("is_active", ...)` na query —
        // se ela parar de filtrar, o mock volta a devolver os inativos
        // também, fazendo o teste de regressão falhar de verdade.
        const rows = (state.candidates ?? []).filter(
          (c) =>
            c.election_id === filters.election_id &&
            (filters.is_active === undefined || (c.is_active ?? true) === filters.is_active)
        );
        return { data: rows.map((r) => ({ id: r.id, name: r.name })), error: null };
      }

      if (table === "polls" && op === "insert") {
        calls.pollInserts.push(insertPayload);
        if (state.pollInsertError) {
          return { data: null, error: state.pollInsertError };
        }
        return { data: { id: state.pollInsertId ?? "poll-1" }, error: null };
      }

      if (table === "poll_results" && op === "insert") {
        calls.pollResultsInserts.push(insertPayload);
        if (state.pollResultsInsertError) {
          return { data: null, error: state.pollResultsInsertError };
        }
        return { data: insertPayload, error: null };
      }

      if (table === "polls" && op === "delete") {
        calls.pollDeletes.push(filters.id as string);
        if (state.pollDeleteError) {
          return { data: null, error: state.pollDeleteError };
        }
        return { data: null, error: null };
      }

      throw new Error(`Chamada não coberta pelo mock: table=${table} op=${op}`);
    }

    return builder;
  }

  return { calls, client: { from } };
}

function basePayload(overrides: Partial<PollIngestionPayload> = {}): PollIngestionPayload {
  return {
    institute_name: "Instituto X",
    election_name: "Eleição Y",
    publication_date: "2026-10-01",
    fieldwork_end: "2026-09-30",
    sample_size: 2000,
    methodology: "telefonica",
    results: [
      { candidate_name: "Fulano", percentage: 40 },
      { candidate_name: "Beltrano", percentage: 35 },
    ],
    ...overrides,
  };
}

const ELECTION = { id: "election-1" };
const INSTITUTE = { id: "institute-1" };

describe("ingestPoll", () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  it("insere a pesquisa quando todos os candidatos são resolvidos (fluxo válido)", async () => {
    const { client, calls } = createMockSupabase({
      elections: { "Eleição Y": ELECTION },
      institutes: { "Instituto X": INSTITUTE },
      candidates: [
        { id: "cand-fulano", name: "Fulano", election_id: ELECTION.id },
        { id: "cand-beltrano", name: "Beltrano", election_id: ELECTION.id },
      ],
      pollInsertId: "poll-123",
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await ingestPoll(basePayload());

    expect(result).toEqual({ success: true, skipped: false, poll_id: "poll-123" });
    expect(calls.pollInserts).toHaveLength(1);
    expect(calls.pollResultsInserts).toHaveLength(1);
    expect(calls.pollResultsInserts[0]).toEqual([
      { poll_id: "poll-123", candidate_id: "cand-fulano", percentage: 40 },
      { poll_id: "poll-123", candidate_id: "cand-beltrano", percentage: 35 },
    ]);
  });

  it("interrompe a ingestão sem criar poll quando um candidato não é encontrado", async () => {
    const { client, calls } = createMockSupabase({
      elections: { "Eleição Y": ELECTION },
      institutes: { "Instituto X": INSTITUTE },
      candidates: [{ id: "cand-fulano", name: "Fulano", election_id: ELECTION.id }],
      // "Beltrano" não existe na base de candidatos desta eleição.
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await ingestPoll(basePayload());

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Candidato não encontrado.*Beltrano/);
    expect(calls.pollInserts).toHaveLength(0);
    expect(calls.pollResultsInserts).toHaveLength(0);
  });

  it("interrompe a ingestão quando há correspondência ambígua de candidato", async () => {
    const { client, calls } = createMockSupabase({
      elections: { "Eleição Y": ELECTION },
      institutes: { "Instituto X": INSTITUTE },
      candidates: [
        // Duas linhas para o mesmo nome na mesma eleição — caso real
        // documentado (mesma pessoa, CPF diferente).
        { id: "cand-fulano-1", name: "Fulano", election_id: ELECTION.id },
        { id: "cand-fulano-2", name: "Fulano", election_id: ELECTION.id },
        { id: "cand-beltrano", name: "Beltrano", election_id: ELECTION.id },
      ],
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await ingestPoll(basePayload());

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ambíguo.*Fulano/);
    expect(result.error).toContain("cand-fulano-1");
    expect(result.error).toContain("cand-fulano-2");
    expect(calls.pollInserts).toHaveLength(0);
  });

  it("não deixa resultado parcialmente persistido quando o insert de poll_results falha", async () => {
    const { client, calls } = createMockSupabase({
      elections: { "Eleição Y": ELECTION },
      institutes: { "Instituto X": INSTITUTE },
      candidates: [
        { id: "cand-fulano", name: "Fulano", election_id: ELECTION.id },
        { id: "cand-beltrano", name: "Beltrano", election_id: ELECTION.id },
      ],
      pollInsertId: "poll-123",
      pollResultsInsertError: { message: "constraint violation" },
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await ingestPoll(basePayload());

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/constraint violation/);
    // poll_results nunca "ficou" persistido (foi um único insert que falhou
    // por inteiro) e o poll recém-criado foi removido por compensação.
    expect(calls.pollResultsInserts).toHaveLength(1);
    expect(calls.pollDeletes).toEqual(["poll-123"]);
  });

  it("documenta a limitação quando o próprio rollback de compensação falha", async () => {
    const { client } = createMockSupabase({
      elections: { "Eleição Y": ELECTION },
      institutes: { "Instituto X": INSTITUTE },
      candidates: [
        { id: "cand-fulano", name: "Fulano", election_id: ELECTION.id },
        { id: "cand-beltrano", name: "Beltrano", election_id: ELECTION.id },
      ],
      pollInsertId: "poll-123",
      pollResultsInsertError: { message: "constraint violation" },
      pollDeleteError: { message: "network error" },
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await ingestPoll(basePayload());

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/constraint violation/);
    expect(result.error).toMatch(/rollback.*também falhou/i);
    expect(result.error).toContain("poll-123");
    expect(result.error).toMatch(/limpeza manual/);
  });

  it("preserva o comportamento de deduplicação existente (poll já existe)", async () => {
    const { client, calls } = createMockSupabase({
      elections: { "Eleição Y": ELECTION },
      institutes: { "Instituto X": INSTITUTE },
      existingPolls: [
        {
          election_id: ELECTION.id,
          institute_id: INSTITUTE.id,
          fieldwork_end: "2026-09-30",
          id: "poll-existente",
        },
      ],
      candidates: [{ id: "cand-fulano", name: "Fulano", election_id: ELECTION.id }],
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await ingestPoll(basePayload());

    expect(result).toEqual({
      success: true,
      skipped: true,
      poll_id: "poll-existente",
      reason: "Pesquisa já existe (fieldwork_end: 2026-09-30)",
    });
    // Dedup curto-circuita antes de resolver candidatos ou criar qualquer
    // registro novo.
    expect(calls.candidateQueries).toHaveLength(0);
    expect(calls.pollInserts).toHaveLength(0);
  });

  it("preserva o comportamento existente para eleição não encontrada", async () => {
    const { client } = createMockSupabase({
      elections: {},
      institutes: { "Instituto X": INSTITUTE },
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await ingestPoll(basePayload());

    expect(result).toEqual({
      success: false,
      error: 'Eleição não encontrada: "Eleição Y"',
    });
  });

  it("resolve para o candidato ativo quando há uma duplicata inativa com o mesmo nome", async () => {
    const { client, calls } = createMockSupabase({
      elections: { "Eleição Y": ELECTION },
      institutes: { "Instituto X": INSTITUTE },
      candidates: [
        // Duplicata desativada (soft-delete) — não deve contar na resolução.
        { id: "cand-fulano-inativo", name: "Fulano", election_id: ELECTION.id, is_active: false },
        { id: "cand-fulano-ativo", name: "Fulano", election_id: ELECTION.id, is_active: true },
        { id: "cand-beltrano", name: "Beltrano", election_id: ELECTION.id, is_active: true },
      ],
      pollInsertId: "poll-123",
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await ingestPoll(basePayload());

    expect(result).toEqual({ success: true, skipped: false, poll_id: "poll-123" });
    expect(calls.pollResultsInserts[0]).toEqual([
      { poll_id: "poll-123", candidate_id: "cand-fulano-ativo", percentage: 40 },
      { poll_id: "poll-123", candidate_id: "cand-beltrano", percentage: 35 },
    ]);
  });

  it("interrompe a ingestão quando só existe candidato inativo com o nome do payload", async () => {
    const { client, calls } = createMockSupabase({
      elections: { "Eleição Y": ELECTION },
      institutes: { "Instituto X": INSTITUTE },
      candidates: [
        // "Fulano" só existe desativado — não há ativo correspondente.
        { id: "cand-fulano-inativo", name: "Fulano", election_id: ELECTION.id, is_active: false },
        { id: "cand-beltrano", name: "Beltrano", election_id: ELECTION.id, is_active: true },
      ],
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await ingestPoll(basePayload());

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Candidato não encontrado.*Fulano/);
    expect(calls.pollInserts).toHaveLength(0);
    expect(calls.pollResultsInserts).toHaveLength(0);
  });

  it("continua rejeitando ambiguidade quando dois candidatos ATIVOS têm o mesmo nome", async () => {
    const { client, calls } = createMockSupabase({
      elections: { "Eleição Y": ELECTION },
      institutes: { "Instituto X": INSTITUTE },
      candidates: [
        { id: "cand-fulano-1", name: "Fulano", election_id: ELECTION.id, is_active: true },
        { id: "cand-fulano-2", name: "Fulano", election_id: ELECTION.id, is_active: true },
        { id: "cand-beltrano", name: "Beltrano", election_id: ELECTION.id, is_active: true },
      ],
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await ingestPoll(basePayload());

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ambíguo.*Fulano/);
    expect(result.error).toContain("cand-fulano-1");
    expect(result.error).toContain("cand-fulano-2");
    expect(calls.pollInserts).toHaveLength(0);
  });

  it("permite pesquisa sem resultados (results: [])", async () => {
    const { client, calls } = createMockSupabase({
      elections: { "Eleição Y": ELECTION },
      institutes: { "Instituto X": INSTITUTE },
      candidates: [],
      pollInsertId: "poll-sem-resultados",
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await ingestPoll(basePayload({ results: [] }));

    expect(result).toEqual({
      success: true,
      skipped: false,
      poll_id: "poll-sem-resultados",
    });
    expect(calls.pollResultsInserts).toHaveLength(0);
  });
});
