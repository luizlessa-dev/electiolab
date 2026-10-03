/** Carregamento das amostras reais do TSE usadas nos testes (sem rede). */

import * as fs from "fs";
import * as path from "path";
import type { ArquivoAcompanhamento, ArquivoEleC, ArquivoResultado } from "../tipos";

const DIR = path.join(__dirname, "fixtures");

export function carregarFixture<T>(nome: string): T {
  return JSON.parse(fs.readFileSync(path.join(DIR, nome), "utf-8")) as T;
}

export const eleC = () => carregarFixture<ArquivoEleC>("ele-c.json");
export const ea14Federal = () => carregarFixture<ArquivoAcompanhamento>("br-e021270-ab.json");
export const ea15Acre = () => carregarFixture<ArquivoAcompanhamento>("ac-e021272-ab.json");

/** Os 9 EA20 amostrados, com o tipo de disputa que a config informa para cada cargo. */
export const EA20: {
  nome: string;
  arquivo: string;
  tipoDisputa: "majoritario" | "proporcional";
  cargo: number;
}[] = [
  { nome: "Presidente BR", arquivo: "br-c0001-e021270-u.json", tipoDisputa: "majoritario", cargo: 1 },
  { nome: "Governador MG", arquivo: "mg-c0003-e021272-u.json", tipoDisputa: "majoritario", cargo: 3 },
  { nome: "Governador AP", arquivo: "ap-c0003-e021272-u.json", tipoDisputa: "majoritario", cargo: 3 },
  { nome: "Governador MA", arquivo: "ma-c0003-e021272-u.json", tipoDisputa: "majoritario", cargo: 3 },
  { nome: "Governador RR", arquivo: "rr-c0003-e021272-u.json", tipoDisputa: "majoritario", cargo: 3 },
  { nome: "Senador AC", arquivo: "ac-c0005-e021272-u.json", tipoDisputa: "majoritario", cargo: 5 },
  { nome: "Dep. Federal AC", arquivo: "ac-c0006-e021272-u.json", tipoDisputa: "proporcional", cargo: 6 },
];

export function ea20(arquivo: string): ArquivoResultado {
  return carregarFixture<ArquivoResultado>(arquivo);
}
