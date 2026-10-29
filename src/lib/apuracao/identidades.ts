/**
 * Validação de esquema por **identidades aritméticas** de cada EA20.
 *
 * Por que existe: a mudança de leiaute entre simulado e oficial é um dos riscos do
 * projeto (`apuracao-2026/docs/arquitetura.md` → "Riscos"), e a mitigação escolhida foi
 * "validação de schema com erro explícito, não silencioso". Se uma identidade
 * **bloqueante** falha, o coletor registra o erro em `apuracao.coletor_execucao` e
 * **não normaliza** aquele arquivo (o bruto continua sendo guardado, como prova).
 *
 * Classificação (as 9 amostras EA20 do simulado passam em todas):
 *
 *  - **Bloqueante** — decomposições internas de um mesmo bloco (`v`, `s`, `e`) e somas
 *    da hierarquia `agr → par → cand`. Valem em qualquer percentual de totalização,
 *    porque são a própria definição dos campos.
 *  - **Aviso** — relações cujo comportamento abaixo de 100% não pôde ser observado
 *    (todas as amostras estão em `and='f'`) ou que dependem de uma escolha do TSE que
 *    pode mudar sem invalidar o dado. Ficam registradas, mas não impedem a gravação.
 *
 * Correções ao "Mapa de campos" apuradas aqui (28/09/2026):
 *  - `e.c = v.tv` **não** é identidade: falha no Senador. A relação real é
 *    `tv = c × nv` no majoritário (2 vagas ⇒ 2 votos por eleitor) e `tv = c` no
 *    proporcional (1 voto por eleitor, independentemente de `nv`).
 *  - `nº de candidatos com e='s' = nv` **não** é identidade: falha em 4 das 9 amostras
 *    (AP sem eleito; BR/MA/MG com dois candidatos rotulados `2º turno` e `e='s'`).
 *    Não é verificada nem como aviso.
 */

import type { ArquivoResultado } from "./tipos";

export type SeveridadeIdentidade = "bloqueante" | "aviso";

export interface FalhaIdentidade {
  identidade: string;
  severidade: SeveridadeIdentidade;
  esperado: number;
  obtido: number;
  detalhe?: string;
}

export interface ResultadoValidacao {
  ok: boolean;
  falhas: FalhaIdentidade[];
  /** Só as bloqueantes — se houver alguma, o arquivo não é normalizado. */
  bloqueantes: FalhaIdentidade[];
}

/** Inteiro do TSE tolerante a ausência (usado só dentro das somas de conferência). */
function n(valor: string | undefined | null): number {
  if (valor === undefined || valor === null || valor.trim() === "") return 0;
  const x = Number(valor.trim());
  return Number.isFinite(x) ? x : 0;
}

function pct(valor: string | undefined | null): number | null {
  if (!valor) return null;
  const x = Number(valor.trim().replace(",", "."));
  return Number.isFinite(x) ? x : null;
}

/**
 * Valida um EA20. `tipoDisputa` vem da config (`cp.tp`: 1 majoritário, 2 proporcional) —
 * não é inferido do arquivo, para que a ausência de `vl` num proporcional apareça como
 * falha em vez de passar em branco.
 */
export function validarEA20(
  arquivo: ArquivoResultado,
  tipoDisputa: "majoritario" | "proporcional",
): ResultadoValidacao {
  const falhas: FalhaIdentidade[] = [];
  const add = (
    identidade: string,
    severidade: SeveridadeIdentidade,
    esperado: number,
    obtido: number,
    detalhe?: string,
  ) => {
    if (esperado !== obtido) falhas.push({ identidade, severidade, esperado, obtido, detalhe });
  };

  const cargo = arquivo.carg?.[0];
  if (!cargo) {
    return {
      ok: false,
      falhas: [
        { identidade: "carg[] presente", severidade: "bloqueante", esperado: 1, obtido: 0 },
      ],
      bloqueantes: [
        { identidade: "carg[] presente", severidade: "bloqueante", esperado: 1, obtido: 0 },
      ],
    };
  }

  const v = arquivo.v;
  const s = arquivo.s;
  const e = arquivo.e;
  const proporcional = tipoDisputa === "proporcional";
  const vagas = n(cargo.nv);

  const partidos = cargo.agr.flatMap((a) => a.par);
  const candidatos = partidos.flatMap((p) => p.cand ?? []);

  // --- bloco de votos (v) ---
  add("tv = vvc + vb + tvn", "bloqueante", n(v.tv), n(v.vvc) + n(v.vb) + n(v.tvn));
  add("tvn = vn + vnt", "bloqueante", n(v.tvn), n(v.vn) + n(v.vnt));
  add("vvc = vv + van + vansj", "bloqueante", n(v.vvc), n(v.vv) + n(v.van) + n(v.vansj));
  add(
    proporcional ? "vv = vnom + vl (proporcional)" : "vv = vnom (majoritário)",
    "bloqueante",
    n(v.vv),
    proporcional ? n(v.vnom) + n(v.vl) : n(v.vnom),
  );

  // Cruza o bloco `e` com o bloco `v`. No majoritário cada eleitor deposita `nv` votos
  // (Senado com 2 vagas ⇒ tv = 2 × comparecimento); no proporcional, sempre 1.
  const votosPorEleitor = proporcional ? 1 : vagas;
  add(
    `tv = comparecimento × ${votosPorEleitor}`,
    "bloqueante",
    n(v.tv),
    n(e.c) * votosPorEleitor,
    `nv=${vagas}, tipo=${tipoDisputa}`,
  );

  // --- bloco de seções (s) e eleitorado (e): decomposições internas ---
  add("s.ts = s.st + s.snt", "bloqueante", n(s.ts), n(s.st) + n(s.snt));
  // `si`/`sni` (instaladas / não instaladas) só são preenchidos pelo TSE depois que as
  // urnas abrem: no oficial pré-eleição vêm `0`/`0` com `ts` > 0. Por isso são aviso, não
  // bloqueio (o simulado, sempre em 100%, não mostrava isso). A integridade das seções
  // continua garantida por `s.ts = s.st + s.snt`.
  add("s.si + s.sni = s.ts", "aviso", n(s.ts), n(s.si) + n(s.sni));
  add("e.te = e.est + e.esnt", "bloqueante", n(e.te), n(e.est) + n(e.esnt));
  add("e.esi + e.esni = e.te", "aviso", n(e.te), n(e.esi) + n(e.esni));
  // Abaixo de 100% não sabemos se `esi` já conta seções instaladas mas não totalizadas,
  // então esta fica como aviso (todas as amostras estão em and='f').
  add("e.c + e.a = e.esi", "aviso", n(e.esi), n(e.c) + n(e.a));

  // --- somas da hierarquia agr -> par -> cand ---
  add(
    "Σ par.tvtn = vnom",
    "bloqueante",
    n(v.vnom),
    partidos.reduce((t, p) => t + n(p.tvtn), 0),
  );
  if (proporcional) {
    add(
      "Σ par.tvtl = vl",
      "bloqueante",
      n(v.vl),
      partidos.reduce((t, p) => t + n(p.tvtl), 0),
    );
  }
  for (const p of partidos) {
    if (p.tvan === undefined) continue;
    add(
      "par.tvan = Σ cand.vap",
      "bloqueante",
      n(p.tvan),
      (p.cand ?? []).reduce((t, c) => t + n(c.vap), 0),
      `partido ${p.n} (${p.sg})`,
    );
  }
  add(
    "vvc = Σ cand.vap + Σ par.tval + vsan",
    "bloqueante",
    n(v.vvc),
    candidatos.reduce((t, c) => t + n(c.vap), 0) +
      partidos.reduce((t, p) => t + n(p.tval), 0) +
      n(v.vsan),
  );

  // --- avisos ---
  // Denominador do percentual do TSE: vvc - vsan (não os votos válidos).
  const denominador = n(v.vvc) - n(v.vsan);
  if (denominador > 0) {
    for (const c of candidatos) {
      const informado = pct(c.pvapn);
      if (informado === null) continue;
      const calculado = (100 * n(c.vap)) / denominador;
      if (Math.abs(informado - calculado) > 1e-6) {
        falhas.push({
          identidade: "cand.pvapn = 100 × vap / (vvc − vsan)",
          severidade: "aviso",
          esperado: calculado,
          obtido: informado,
          detalhe: `candidato ${c.n}`,
        });
        break; // um exemplo basta; o padrão é do arquivo, não do candidato
      }
    }
  }
  if (proporcional) {
    // Propriedade do resultado fechado: só faz sentido conferir no final.
    if (arquivo.and === "f") {
      add(
        "Σ agr.vag = nv (proporcional, final)",
        "aviso",
        vagas,
        cargo.agr.reduce((t, a) => t + n(a.vag), 0),
      );
    }
  }

  const bloqueantes = falhas.filter((f) => f.severidade === "bloqueante");
  return { ok: bloqueantes.length === 0, falhas, bloqueantes };
}

/** Linha única para `coletor_execucao.mensagem` / log. */
export function descreverFalha(f: FalhaIdentidade): string {
  const alvo = f.detalhe ? ` [${f.detalhe}]` : "";
  return `${f.severidade}: ${f.identidade}${alvo} — esperado ${f.esperado}, obtido ${f.obtido}`;
}
