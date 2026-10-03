/**
 * Motor de distribuição de cadeiras — eleição proporcional (Código Eleitoral, arts. 106-109).
 *
 * Regra 8 do `apuracao-2026/CLAUDE.md`: isto é sempre "cálculo Electiolab", nunca dado
 * oficial. O TSE já informa quem foi eleito (`votacao_candidato.situacao`); este motor
 * serve para simular/projetar antes ou durante a apuração, e para validar o próprio
 * entendimento da lei contra o gabarito oficial (`scripts/simulador-validar.ts`).
 *
 * Fundamentação:
 * - Art. 106: quociente eleitoral (QE) = votos válidos / vagas; fração > 0,5 arredonda
 *   para cima, ≤ 0,5 é desprezada.
 * - Art. 107: quociente partidário (QP) de cada agrupamento = votos válidos do
 *   agrupamento / QE, **truncado** (sem arredondar).
 * - Art. 108: dentro do QP, só concorrem candidatos com votos nominais ≥ 10% do QE,
 *   na ordem de votos recebidos. Se um agrupamento não tiver candidatos suficientes
 *   acima do piso para preencher todo o seu QP, a(s) vaga(s) que sobra(m) somam-se às
 *   sobras gerais (não ficam "perdidas" nem vão para candidatos abaixo do piso).
 * - Art. 109: as vagas não preenchidas pelo QP (sobras) — **duas etapas**, correção de
 *   28/09/2026 depois de bater com o gabarito: o STF
 *   (ADIs 7228/7263/7325, embargos julgados 13/03/2025, efeito desde 2022) derrubou só
 *   a barreira de 80/20 da **etapa final** do art. 109 — não o art. 109 inteiro, e não
 *   as duas primeiras etapas dele (incisos I-II), que continuam valendo:
 *   1. **Etapa 1 (art. 109, I-II — com a barreira de 80/20):** só concorre o
 *      agrupamento com votos válidos ≥ 80% do QE, e só leva a vaga se tiver candidato
 *      elegível ainda não eleito com votos ≥ 20% do QE (esse candidato específico é
 *      quem senta). A cada rodada, entre os agrupamentos que atendem as duas
 *      exigências, vence a maior média (`votosValidos / (vagasAtuais + 1)`). Repete
 *      até que nenhum agrupamento atenda as duas exigências ao mesmo tempo — aí a
 *      etapa acaba, mesmo com vagas sobrando.
 *   2. **Etapa 2 (art. 109, III — sem a barreira, é a parte que o STF liberou):** as
 *      vagas que sobrarem da etapa 1 vão por maiores médias entre **todos** os
 *      agrupamentos, sem piso de agrupamento nem de candidato.
 * - As vagas de qualquer uma das duas etapas de média vão para os candidatos seguintes
 *   da mesma lista única (por votos, decrescente). Na etapa 1, o candidato que senta
 *   precisa ele mesmo ter ≥ 20% do QE (é o que define a vaga daquela rodada). Na etapa
 *   2, não há piso de candidato — confirmado contra o gabarito real (Dep. Estadual SE,
 *   disputa 494 do schema `apuracao`: os 16 eleitos "por média" do PARTIDO 9974 têm
 *   todos menos de 10% do QE, e nenhum candidato de nenhum agrupamento da disputa passa
 *   de 10% — então um piso de 10% *também* na etapa 2, hipótese cogitada antes de
 *   implementar isto, fica refutada pelos dados, não suposta).
 * - Lista única: partido isolado ou federação concorrem como uma lista só (a ordem dos
 *   candidatos pelo agrupamento inteiro, não por partido dentro dele).
 * - Candidato só é elegível para vaga (QP ou média) com `destinacao === "Válido"`. Um
 *   candidato com destinação "Válido (legenda)" (raro) tem seus votos somados à legenda
 *   do partido, mas ele mesmo não concorre a vaga individual. Destinações "Anulado" e
 *   "Anulado sub judice" também ficam fora da lista de elegíveis.
 *
 * Validado em 28/09/2026 contra as 54 disputas proporcionais reais do schema `apuracao`
 * (Supabase do Electiolab, leitura via `scripts/simulador-validar.ts`): **50 de 54**
 * batem exatamente com `votacao_agrupamento.vagas_obtidas` e `votacao_candidato.situacao`.
 * As 4 que não batem (Dep. Federal RS, Dep. Estadual PE/SE/TO) têm dois padrões, ambos
 * documentados com números reais no relatório da sessão — não corrigidos aqui porque
 * exigiriam supor uma regra sem confirmação nos dados desta disputa:
 * 1. **RS, PE, SE (estadual):** nenhum candidato da disputa inteira chega a 20% do QE
 *    (confirmado por SQL), então a etapa 1 nunca contribui vaga nenhuma — tudo cai na
 *    etapa 2, sem piso. Mesmo assim, um agrupamento pequeno (ex.: SE estadual, disputa
 *    494, "Federacao teste..." com 32.584 votos) ganha vaga que a maior-média pura daria
 *    a um agrupamento maior (ex.: PARTIDO 9974 com 1.039.773 votos, 74,6% da disputa,
 *    fica em 16 vagas quando a maior-média sem piso nenhum lhe daria as 24 inteiras).
 * 2. **TO (estadual), disputa 496 — Padrão B:** a FEDERAÇÃO 9995 (40.422 votos, 24
 *    candidatos `Válido`, nenhum usado) tem a maior média disponível numa rodada da
 *    etapa 2 (40.422 contra 35.968 do PARTIDO 9974 no mesmo instante) e ainda assim fica
 *    com 0 vagas no gabarito oficial — o PARTIDO 9974 leva a vaga no lugar dela. Não há,
 *    nos dados desta disputa (candidatos, QP, piso), nenhuma razão visível pra excluir a
 *    federação — a exclusão só é observável com dados nacionais, não por UF: o partido/
 *    federação é excluído das sobras por não atingir a **cláusula de desempenho
 *    nacional** (Lei 9.096/1995, art. 17-A), que não aparece nos dados de uma única UF
 *    e portanto não é implementada neste motor (que só recebe dados de uma disputa/UF
 *    por vez).
 */

export type MotivoVaga = "QP" | "media";

export interface CandidatoEntrada {
  /** Identificador único do candidato dentro do agrupamento (ex.: `sqcand` ou número de urna). */
  id: string;
  numero: number;
  nomeUrna: string;
  /** Votos apurados (`vap`). */
  votos: number;
  /**
   * Desempate para candidatos com `votos` idênticos na mesma lista: a lei (art. 108)
   * só manda ordenar "pela ordem de votação recebida", sem prever este caso — a
   * confirmação empírica está em 13 pares empatados no gabarito real (54 disputas,
   * ver `scripts/simulador-validar.ts`), todos resolvidos pelo `seq` do TSE
   * (`votacao_candidato.posicao`): quem tem o `seq` **menor** é sempre o eleito.
   * `seq` "não é ordem pura de vap" (mapa de campos) — ou seja, o TSE já aplica
   * algum desempate próprio (idade? data de registro? não confirmado na spec) e o
   * expõe nesse campo; em vez de reconstruir a regra sem ter data de nascimento
   * normalizada, replicamos o resultado que o TSE já entrega. Opcional: quando
   * ausente, cai no desempate por número de urna (determinístico, mas não
   * confirmado contra nenhum caso real de empate).
   */
  ordemDesempate?: number;
  /**
   * Destinação do candidato (`cand.dvt` do TSE): `"Válido"` é o único caso elegível
   * para vaga individual. `"Válido (legenda)"`, `"Anulado"` e `"Anulado sub judice"`
   * ficam fora da lista de elegíveis (mas continuam contando para `votosValidos` do
   * agrupamento quando for o caso — isso é decidido por quem monta a entrada, não aqui).
   */
  elegivel: boolean;
}

export interface AgrupamentoEntrada {
  /** Número do agrupamento (`agr.n`). */
  numero: string;
  tipo: "i" | "c" | "f";
  nome: string;
  /**
   * Votos válidos do agrupamento: nominais válidos + legenda (`Σ par.tvtn + Σ par.tvtl`
   * dos partidos do agrupamento). Base do QE e do QP — nunca os votos de um candidato
   * isolado.
   */
  votosValidos: number;
  /** Lista única de candidatos do agrupamento (todos os partidos misturados). */
  candidatos: CandidatoEntrada[];
}

export interface DistribuicaoEntrada {
  /** Número de vagas do cargo (`carg.nv`). */
  vagas: number;
  agrupamentos: AgrupamentoEntrada[];
}

export interface VagaAtribuida {
  agrupamentoNumero: string;
  candidatoId: string;
  numero: number;
  nomeUrna: string;
  votos: number;
  motivo: MotivoVaga;
  /** Posição do candidato (1-indexado) na lista de eleitos do agrupamento, por votos. */
  ordem: number;
}

export interface ResultadoAgrupamento {
  agrupamentoNumero: string;
  votosValidos: number;
  /** QP truncado (art. 107). Pode incluir vagas que não foram preenchidas por falta de candidato acima do piso — ver `vagasPorQp`. */
  quocientePartidario: number;
  /** Vagas efetivamente preenchidas pelo QP (candidatos acima do piso de 10% do QE). */
  vagasPorQp: number;
  /** Vagas preenchidas por maiores médias (sobras). */
  vagasPorMedia: number;
  vagasTotal: number;
}

export interface ResultadoDistribuicao {
  /** Quociente eleitoral (art. 106), calculado — nunca o valor oficial do TSE. */
  quocienteEleitoral: number;
  vagas: number;
  agrupamentos: ResultadoAgrupamento[];
  /** Eleitos, agrupados na ordem de entrada dos agrupamentos. */
  eleitos: VagaAtribuida[];
}

/** Piso individual do art. 108: 10% do QE, para concorrer a vaga pelo quociente partidário. */
const PISO_QP = 0.1;
/** Piso de agrupamento da etapa 1 do art. 109, I-II: 80% do QE (barreira que o STF manteve). */
const PISO_AGRUPAMENTO_ETAPA1 = 0.8;
/** Piso de candidato da etapa 1 do art. 109, I-II: 20% do QE. */
const PISO_CANDIDATO_ETAPA1 = 0.2;

/**
 * QE (art. 106): fração > 0,5 arredonda para cima; ≤ 0,5 desprezada (não é o
 * arredondamento "banker's rounding" nem o `Math.round` do JS, que arredonda 0,5 para
 * cima igual — mas aqui deixamos explícito porque é regra de lei, não coincidência).
 */
function calcularQuocienteEleitoral(totalVotosValidos: number, vagas: number): number {
  if (vagas <= 0) return 0;
  const bruto = totalVotosValidos / vagas;
  const piso = Math.floor(bruto);
  const fracao = bruto - piso;
  return fracao > 0.5 ? piso + 1 : piso;
}

function ordenarPorVotosDesc(candidatos: CandidatoEntrada[]): CandidatoEntrada[] {
  return [...candidatos].sort((a, b) => {
    if (b.votos !== a.votos) return b.votos - a.votos;
    if (a.ordemDesempate !== undefined && b.ordemDesempate !== undefined) {
      if (a.ordemDesempate !== b.ordemDesempate) return a.ordemDesempate - b.ordemDesempate;
    }
    return a.numero - b.numero;
  });
}

interface EstadoAgrupamento {
  entrada: AgrupamentoEntrada;
  candidatosOrdenados: CandidatoEntrada[];
  quocientePartidario: number;
  vagasPorQp: number;
  vagasPorMedia: number;
  /** Ids já eleitos (QP + etapas 1 e 2), pra achar sempre o próximo elegível da lista. */
  usados: Set<string>;
}

/**
 * Preenche as vagas do QP de um agrupamento: percorre a lista única por votos
 * decrescentes e concede uma vaga a cada candidato elegível com votos ≥ 10% do QE,
 * até `quocientePartidario` vagas. Candidatos abaixo do piso são pulados (não
 * consomem vaga, não ficam eleitos por QP) — o restante do QP não preenchido volta
 * para as sobras gerais (etapa 1 ou 2 do art. 109).
 */
function preencherQp(estado: EstadoAgrupamento, qe: number): VagaAtribuida[] {
  const piso = PISO_QP * qe;
  const eleitos: VagaAtribuida[] = [];
  for (const candidato of estado.candidatosOrdenados) {
    if (eleitos.length >= estado.quocientePartidario) break;
    if (!candidato.elegivel) continue;
    if (candidato.votos < piso) continue;
    estado.usados.add(candidato.id);
    eleitos.push({
      agrupamentoNumero: estado.entrada.numero,
      candidatoId: candidato.id,
      numero: candidato.numero,
      nomeUrna: candidato.nomeUrna,
      votos: candidato.votos,
      motivo: "QP",
      ordem: 0, // recalculado no final, por agrupamento
    });
  }
  estado.vagasPorQp = eleitos.length;
  return eleitos;
}

/** Primeiro candidato elegível, ainda não usado, com votos ≥ `votosMinimos` (lista já ordenada por votos desc). */
function proximoElegivel(estado: EstadoAgrupamento, votosMinimos: number): CandidatoEntrada | undefined {
  return estado.candidatosOrdenados.find(
    (c) => c.elegivel && !estado.usados.has(c.id) && c.votos >= votosMinimos,
  );
}

function calcularMedia(estado: EstadoAgrupamento): number {
  return estado.entrada.votosValidos / (estado.vagasPorQp + estado.vagasPorMedia + 1);
}

interface Candidatura {
  estado: EstadoAgrupamento;
  candidato: CandidatoEntrada;
}

/**
 * Escolhe, entre as candidaturas concorrendo a uma vaga, a de maior média. Empate
 * (art. 109 §2º): vence quem tem o candidato individualmente mais votado — o que vai
 * de fato ocupar a vaga, não o agrupamento com mais votos no total (confirmado contra
 * o gabarito real: desempate por total do agrupamento dava resultado errado, por
 * candidato mais votado bate). Persistindo o empate, a lei manda o mais idoso — sem
 * data de nascimento normalizada, o desempate final é a ordem estável pelo número do
 * agrupamento (suposição, não confirmada contra nenhum caso real de empate duplo).
 */
function melhorPorMedia(candidaturas: Candidatura[]): Candidatura | null {
  let melhor: Candidatura | null = null;
  let melhorMedia = -Infinity;
  for (const atual of candidaturas) {
    const media = calcularMedia(atual.estado);
    if (melhor === null || media > melhorMedia) {
      melhor = atual;
      melhorMedia = media;
      continue;
    }
    if (media !== melhorMedia) continue;
    if (
      atual.candidato.votos > melhor.candidato.votos ||
      (atual.candidato.votos === melhor.candidato.votos &&
        atual.estado.entrada.numero < melhor.estado.entrada.numero)
    ) {
      melhor = atual;
      melhorMedia = media;
    }
  }
  return melhor;
}

function elegerPorMedia(candidatura: Candidatura): VagaAtribuida {
  candidatura.estado.vagasPorMedia += 1;
  candidatura.estado.usados.add(candidatura.candidato.id);
  return {
    agrupamentoNumero: candidatura.estado.entrada.numero,
    candidatoId: candidatura.candidato.id,
    numero: candidatura.candidato.numero,
    nomeUrna: candidatura.candidato.nomeUrna,
    votos: candidatura.candidato.votos,
    motivo: "media",
    ordem: 0, // recalculado no final, por agrupamento
  };
}

/**
 * Etapa 1 do art. 109 (incisos I-II): só concorrem agrupamentos com votos válidos ≥
 * 80% do QE, e só levam a vaga se tiverem candidato elegível (ainda não eleito) com
 * votos ≥ 20% do QE — é esse candidato quem senta. A cada rodada vence a maior média
 * entre quem atende as duas exigências; a etapa acaba (mesmo com vagas sobrando) assim
 * que nenhum agrupamento mais atender as duas ao mesmo tempo.
 */
function distribuirEtapa1(estados: EstadoAgrupamento[], qe: number, vagasDisponiveis: number): VagaAtribuida[] {
  const pisoAgrupamento = PISO_AGRUPAMENTO_ETAPA1 * qe;
  const pisoCandidato = PISO_CANDIDATO_ETAPA1 * qe;
  const elegiveisAoBarreira = estados.filter((e) => e.entrada.votosValidos >= pisoAgrupamento);

  const eleitos: VagaAtribuida[] = [];
  for (let i = 0; i < vagasDisponiveis; i++) {
    const candidaturas: Candidatura[] = [];
    for (const estado of elegiveisAoBarreira) {
      const candidato = proximoElegivel(estado, pisoCandidato);
      if (candidato) candidaturas.push({ estado, candidato });
    }
    const melhor = melhorPorMedia(candidaturas);
    if (!melhor) break; // nenhum agrupamento atende as duas exigências: etapa acaba.
    eleitos.push(elegerPorMedia(melhor));
  }
  return eleitos;
}

/**
 * Etapa 2 do art. 109, III — a parte que o STF manteve liberada (ADIs 7228/7263/7325,
 * embargos julgados 13/03/2025, efeito desde 2022; art. 111 inconstitucional): as vagas
 * que sobrarem da etapa 1 vão por maiores médias entre TODOS os agrupamentos, sem piso
 * de agrupamento nem de candidato.
 */
function distribuirEtapa2(estados: EstadoAgrupamento[], vagasDisponiveis: number): VagaAtribuida[] {
  const eleitos: VagaAtribuida[] = [];
  for (let i = 0; i < vagasDisponiveis; i++) {
    const candidaturas: Candidatura[] = [];
    for (const estado of estados) {
      if (estado.entrada.votosValidos <= 0) continue;
      const candidato = proximoElegivel(estado, 0);
      if (candidato) candidaturas.push({ estado, candidato });
    }
    const melhor = melhorPorMedia(candidaturas);
    if (!melhor) break;
    eleitos.push(elegerPorMedia(melhor));
  }
  return eleitos;
}

/** Distribui as `vagas` de um cargo proporcional entre os agrupamentos informados. */
export function distribuirCadeiras(entrada: DistribuicaoEntrada): ResultadoDistribuicao {
  const totalVotosValidos = entrada.agrupamentos.reduce(
    (soma, a) => soma + a.votosValidos,
    0,
  );
  const qe = calcularQuocienteEleitoral(totalVotosValidos, entrada.vagas);

  const estados: EstadoAgrupamento[] = entrada.agrupamentos.map((agr) => ({
    entrada: agr,
    candidatosOrdenados: ordenarPorVotosDesc(agr.candidatos),
    quocientePartidario: qe > 0 ? Math.floor(agr.votosValidos / qe) : 0,
    vagasPorQp: 0,
    vagasPorMedia: 0,
    usados: new Set<string>(),
  }));

  const eleitosPorAgrupamento = new Map<string, VagaAtribuida[]>(estados.map((e) => [e.entrada.numero, []]));
  const acrescentar = (lista: VagaAtribuida[]) => {
    for (const vaga of lista) {
      eleitosPorAgrupamento.get(vaga.agrupamentoNumero)!.push(vaga);
    }
  };

  // 1) QP — preenche o que der, respeitando o piso de 10% do QE (art. 107-108).
  for (const estado of estados) acrescentar(preencherQp(estado, qe));

  // 2) Sobras (art. 109) em duas etapas — vagas de QP não preenchidas por falta de
  //    candidato acima do piso entram no total disponível igual às demais.
  const totalQpPreenchido = estados.reduce((soma, e) => soma + e.vagasPorQp, 0);
  let sobras = entrada.vagas - totalQpPreenchido;

  if (sobras > 0) {
    const eleitosEtapa1 = distribuirEtapa1(estados, qe, sobras);
    acrescentar(eleitosEtapa1);
    sobras -= eleitosEtapa1.length;
  }
  if (sobras > 0) {
    acrescentar(distribuirEtapa2(estados, sobras));
  }

  // 3) `ordem` final de cada agrupamento: todos os seus eleitos (QP + etapas 1 e 2),
  //    na ordem de votos (a mesma da lista única) — não a ordem em que foram decididos.
  for (const [numero, lista] of eleitosPorAgrupamento) {
    const porId = new Map(lista.map((v) => [v.candidatoId, v]));
    const estado = estados.find((e) => e.entrada.numero === numero)!;
    let ordem = 0;
    for (const candidato of estado.candidatosOrdenados) {
      const vaga = porId.get(candidato.id);
      if (vaga) vaga.ordem = ++ordem;
    }
  }

  const agrupamentos: ResultadoAgrupamento[] = estados.map((estado) => ({
    agrupamentoNumero: estado.entrada.numero,
    votosValidos: estado.entrada.votosValidos,
    quocientePartidario: estado.quocientePartidario,
    vagasPorQp: estado.vagasPorQp,
    vagasPorMedia: estado.vagasPorMedia,
    vagasTotal: estado.vagasPorQp + estado.vagasPorMedia,
  }));

  const eleitos = estados.flatMap((estado) => eleitosPorAgrupamento.get(estado.entrada.numero) ?? []);

  return { quocienteEleitoral: qe, vagas: entrada.vagas, agrupamentos, eleitos };
}
