// Lógica pura de montagem do prompt de síntese — separada do script pra
// poder ser testada (Jest só enxerga src/, não scripts/).

export type TrechoFonte = { pagina: number; texto: string };

// Ordena e remove duplicata de página — usado tanto no prompt (mostrar em
// ordem) quanto no paginas_referencia gravado no banco.
export function paginasUnicas(trechos: TrechoFonte[]): number[] {
  return [...new Set(trechos.map((t) => t.pagina))].sort((a, b) => a - b);
}

// Monta o texto-fonte que vai pro LLM: só os trechos já classificados pra
// esse candidato+tema, cada um marcado com a própria página — nunca o plano
// inteiro, pra não dar chance da síntese absorver contexto de outro tema.
export function montarFonte(trechos: TrechoFonte[]): string {
  return trechos.map((t) => `[p.${t.pagina}] ${t.texto}`).join("\n\n");
}
