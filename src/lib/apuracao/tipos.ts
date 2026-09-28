/**
 * Tipos dos arquivos JSON de divulgação do TSE.
 *
 * Fonte: `apuracao-2026/docs/arquitetura.md` → "Mapa de campos" (levantado sobre as
 * amostras reais do simulado). **Todo valor é string no arquivo do TSE**, inclusive
 * números e percentuais (`"528951"`, `"7,53"`, `"7,527528669"`). A conversão fica em
 * `valores.ts`; aqui os campos são tipados como vieram.
 *
 * Campos marcados `[?]` têm significado inferido — a spec em PDF ainda não foi
 * reconciliada (Fase 0, item 2 pendente).
 */

/** Envelope comum: data/hora e id de geração do arquivo. */
export interface EnvelopeTse {
  /** Data de geração do arquivo (`dd/mm/aaaa`). */
  dg: string;
  /** Hora de geração do arquivo (`hh:mm:ss`). */
  hg: string;
  /** Id de geração — campo de idempotência (string numérica). */
  idg: string;
  f?: string;
}

// ---------------------------------------------------------------------------
// EA11 — comum/config/ele-c.json
// ---------------------------------------------------------------------------

/** Template de diretório por tipo de arquivo. */
export interface ArqTemplate {
  /** `ft` fotos · `cm` config de municípios · `e` eleitos · `cs` config de seções · `t` totalização · `ab` acompanhamento · `u` resultado unificado · `aux` auxiliar de seção. */
  tp: string;
  /** Com placeholders `<base>`, `<ambiente>`, `<ciclo>`, `<cd_eleicao>`, `<uf>`, `<cd_pleito>`… */
  dir: string;
}

export interface CargoConfigTse {
  /** Código do cargo (`"1"` Presidente, `"3"` Governador, `"5"` Senador…). */
  cd: string;
  /** Descrição (`"Presidente"`). */
  ds: string;
  /** `"1"` majoritário · `"2"` proporcional. */
  tp: string;
}

export interface AbrangenciaConfigTse {
  cd: string;
  cp: CargoConfigTse[];
}

export interface EleicaoConfigTse {
  /** Código da eleição (`"21270"`). */
  cd: string;
  /** Código da eleição do 2º turno (`""` quando não há). */
  cdt2: string;
  sqele: string;
  nm: string;
  /** Turno. */
  t: string;
  /** `"8"` federal · `"1"` estadual · `"3"` municipal. */
  tp: string;
  abr: AbrangenciaConfigTse[];
}

export interface PleitoConfigTse {
  /** Código do pleito (`"17801"`). */
  cd: string;
  cdpr?: string;
  /** Ciclo (`"ele2026"`). */
  c: string;
  /** Data do pleito (`dd/mm/aaaa`; fictícia no simulado). */
  dt: string;
  dtlim?: string;
  e: EleicaoConfigTse[];
}

/** `comum/config/ele-c.json` */
export interface ArquivoEleC extends EnvelopeTse {
  arq: ArqTemplate[];
  pl: PleitoConfigTse[];
}

// ---------------------------------------------------------------------------
// EA12 — <cd_eleicao>/config/mun-e<ELE>-cm.json
// ---------------------------------------------------------------------------

export interface MunicipioTse {
  /** Código TSE, 5 dígitos com zeros à esquerda. */
  cd: string;
  /** Código IBGE de 7 dígitos; `""` no Exterior. */
  cdi: string;
  nm: string;
  /** `"s"` quando capital. */
  c: string;
  z?: string[];
}

export interface AbrangenciaMunTse {
  /** UF minúscula, ou `zz` (Exterior). */
  cd: string;
  ds: string;
  mu: MunicipioTse[];
}

/** `mun-e<ELE>-cm.json` */
export interface ArquivoMunCm extends EnvelopeTse {
  abr: AbrangenciaMunTse[];
}

// ---------------------------------------------------------------------------
// Blocos de seções / eleitorado / votos (compartilhados por EA14, EA15 e EA20)
// ---------------------------------------------------------------------------

/** Bloco `s` — seções. `ts = st + snt` e `si + sni = ts`. */
export interface BlocoSecoes {
  /** Total de seções. */
  ts: string;
  /** Totalizadas. */
  st: string;
  /** Não totalizadas. */
  snt: string;
  /** Instaladas `[?]`. */
  si?: string;
  /** Não instaladas `[?]`. */
  sni?: string;
  /** `[?]` */
  sa?: string;
  /** `[?]` */
  sna?: string;
  /** % totalizadas, 2 casas. */
  pst?: string;
  /** % totalizadas, 9 casas — é esta que normalizamos. */
  pstn?: string;
  [k: string]: string | undefined;
}

/** Bloco `e` — eleitorado. `te = est + esnt`, `esi + esni = te`, `c + a = esi`. */
export interface BlocoEleitorado {
  /** Total de eleitores. */
  te: string;
  /** Eleitorado totalizado. */
  est: string;
  /** Não totalizado. */
  esnt: string;
  /** Em seções instaladas `[?]`. */
  esi?: string;
  /** Em seções não instaladas `[?]`. */
  esni?: string;
  /** `[?]` */
  esa?: string;
  /** `[?]` */
  esna?: string;
  /** Comparecimento. */
  c?: string;
  /** Abstenção. */
  a?: string;
  [k: string]: string | undefined;
}

/** Bloco `v` — votos (só no EA20). */
export interface BlocoVotos {
  /** Total de votos. */
  tv: string;
  /** Válidos + anulados (`vv + van + vansj`). */
  vvc: string;
  /** Votos válidos. */
  vv: string;
  /** Nominais. */
  vnom: string;
  /** Legenda — só proporcional (`vv = vnom + vl`). */
  vl?: string;
  /** Anulados. */
  van: string;
  /** Anulados sub judice. */
  vansj: string;
  /** Brancos. */
  vb: string;
  /** Nulos (`vn + vnt`). */
  tvn: string;
  /** Nulos diretos. */
  vn: string;
  /** Nulos técnicos. */
  vnt: string;
  /** Parcela de `van` sem candidato listado. */
  vsan?: string;
  /** `[?]` sempre 0 nas amostras. */
  vscv?: string;
  [k: string]: string | undefined;
}

// ---------------------------------------------------------------------------
// EA14 (Brasil) / EA15 (UF) — <uf>-e<ELE>-ab.json
// ---------------------------------------------------------------------------

export interface AbrangenciaAcompanhamento {
  /** Andamento — só `"f"` (final) observado nas amostras. */
  and: string;
  /** `br` · `uf` · `mun`. */
  tpabr: string;
  /** `br`, UF minúscula (`mg`, `zz`) ou código TSE de município (5 dígitos). */
  cdabr: string;
  /** Data da última totalização da abrangência (`dd/mm/aaaa`). */
  dt: string;
  /** Hora da última totalização (`hh:mm:ss`). */
  ht: string;
  s: BlocoSecoes;
  e: BlocoEleitorado;
  /** Municípios sem resultado recebido (só `tpabr=uf`) `[?]`. */
  munnr?: string;
  /** Municípios com resultado parcial (só `tpabr=uf`) `[?]`. */
  munpt?: string;
  /** Municípios com resultado final (só `tpabr=uf`) `[?]`. */
  munf?: string;
  /** UFs sem resultado recebido (só `tpabr=br`) `[?]`. */
  ufsnr?: string;
  /** UFs com resultado parcial (só `tpabr=br`) `[?]`. */
  ufspt?: string;
  /** UFs com resultado final (só `tpabr=br`) `[?]`. */
  ufsf?: string;
  [k: string]: unknown;
}

/** EA14 (`br-e<ELE>-ab.json`) e EA15 (`<uf>-e<ELE>-ab.json`) têm o mesmo envelope. */
export interface ArquivoAcompanhamento extends EnvelopeTse {
  /** Código da eleição. */
  ele: string;
  /** Turno. */
  t: string;
  abr: AbrangenciaAcompanhamento[];
}

// ---------------------------------------------------------------------------
// EA20 — <abr>-c<CARGO>-e<ELE>-u.json
// ---------------------------------------------------------------------------

/** Vice (`v`) e suplentes do Senado (`s1`, `s2`). */
export interface VinculadoTse {
  /** `v` vice · `s1` 1º suplente · `s2` 2º suplente. */
  tp: string;
  sqcand?: string;
  nm?: string;
  nmu?: string;
  /** Sigla do partido. */
  sgp?: string;
}

/** Candidato substituído por este (`subs[]`): sem `sqcand` e sem votos. */
export interface SubstituidoTse {
  nm?: string;
  nmu?: string;
  sgp?: string;
}

export interface CandidatoTse {
  /** Número de urna. */
  n: string;
  /** Sequencial do candidato (8 dígitos no simulado, 12 no oficial). */
  sqcand: string;
  nm: string;
  nmu: string;
  /** Data de nascimento — não normalizada (fica só no bruto). */
  dt?: string;
  /** Destinação: `Válido` · `Válido (legenda)` · `Anulado` · `Anulado sub judice`. */
  dvt: string;
  /** Posição na lista de resultado do arquivo (não é o sequencial). */
  seq: string;
  /** Eleito: `"s"` / `"n"`. */
  e: string;
  /** Situação, como veio: `Eleito` · `Eleito por média` · `2º turno` · `Suplente` · `Não eleito`. */
  st: string;
  /** Votos apurados. */
  vap: string;
  /** % com 2 casas. */
  pvap?: string;
  /** % com 9 casas — denominador do TSE é `vvc - vsan`, **não** os votos válidos. */
  pvapn?: string;
  vs?: VinculadoTse[];
  subs?: SubstituidoTse[];
}

export interface PartidoTse {
  /** Número do partido. */
  n: string;
  sg: string;
  nm: string;
  /** Número da federação (`""` quando não há). */
  nfed?: string;
  /** Destinação do partido (ex.: `Válido (legenda)`). */
  dvt?: string;
  /** Votos nominais válidos. */
  tvtn?: string;
  /** Votos apurados nominais (`= Σ cand.vap` do partido). */
  tvan?: string;
  /** Legenda total (proporcional). */
  tvtl?: string;
  /** Legenda pura (proporcional). */
  tval?: string;
  cand: CandidatoTse[];
}

export interface AgrupamentoTse {
  /** Id do agrupamento (8 dígitos). */
  n: string;
  nm: string;
  /** `i` partido isolado · `c` coligação · `f` federação. */
  tp: string;
  /** Composição (`"P 9984 / P 9992"`). */
  com?: string;
  /** Vagas obtidas — só significativo no proporcional (`Σ agr.vag = carg.nv`). */
  vag?: string;
  tvtn?: string;
  tvan?: string;
  tvtl?: string;
  tval?: string;
  par: PartidoTse[];
}

export interface FederacaoTse {
  n: string;
  sg: string;
  nm: string;
  com?: string;
  /** Números dos partidos que a compõem. */
  npar?: string[];
}

export interface CargoResultadoTse {
  /** Código do cargo. */
  cd: string;
  /** Nome neutro / masculino / feminino. */
  nmn: string;
  nmm?: string;
  nmf?: string;
  /** Número de vagas do cargo (Senado 2, Dep. Federal AC 8…). */
  nv: string;
  /** Quociente eleitoral **oficial** do TSE — só proporcional. Nunca recalcular. */
  qe?: string;
  fed?: FederacaoTse[];
  agr: AgrupamentoTse[];
}

/** `<abr>-c<CARGO>-e<ELE>-u.json` */
export interface ArquivoResultado extends EnvelopeTse {
  /** Código da eleição. */
  ele: string;
  /** Turno. */
  t: string;
  /** `[?]` */
  sup?: string;
  /** `br` · `uf` · `mun`. */
  tpabr: string;
  /** `br`, UF minúscula, ou UF+código de município. */
  cdabr: string;
  /** Data da totalização. */
  dt: string;
  /** Hora da totalização. */
  ht: string;
  dv?: string;
  /** `[?]` */
  tf?: string;
  /** Andamento — só `"f"` observado. */
  and: string;
  /** `"s"` = o TSE **não** declara eleito; motivos em `mnae`. */
  esae: string;
  /** Motivos, em texto, de não haver eleito. */
  mnae: string[];
  carg: CargoResultadoTse[];
  s: BlocoSecoes;
  e: BlocoEleitorado;
  v: BlocoVotos;
}
