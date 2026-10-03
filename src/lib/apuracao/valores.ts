/**
 * Conversão dos valores do TSE (sempre string) para os tipos do banco.
 *
 * Regra 1 do `apuracao-2026/CLAUDE.md`: os números do TSE são gravados como vieram.
 * Aqui só há troca de representação (string → number, vírgula → ponto, Brasília → UTC);
 * nada é arredondado, somado ou derivado.
 */

/** Fuso de Brasília: UTC−3 fixo (os arquivos do TSE não trazem fuso). */
const OFFSET_BRASILIA = "-03:00";

/** Inteiro do TSE (`"528951"`). `''`/ausente → `null`. Lança se não for inteiro. */
export function inteiro(valor: string | undefined | null): number | null {
  if (valor === undefined || valor === null) return null;
  const t = valor.trim();
  if (t === "") return null;
  if (!/^-?\d+$/.test(t)) {
    throw new Error(`Valor inteiro inesperado do TSE: ${JSON.stringify(valor)}`);
  }
  const n = Number(t);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`Inteiro do TSE fora da faixa segura de JS: ${t}`);
  }
  return n;
}

/**
 * Percentual do TSE com vírgula decimal (`"7,527528669"`). Usar sempre a variante
 * `…n` (9 casas), nunca a de 2 casas. Não arredonda.
 */
export function percentual(valor: string | undefined | null): number | null {
  if (valor === undefined || valor === null) return null;
  const t = valor.trim();
  if (t === "") return null;
  const normalizado = t.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) {
    throw new Error(`Percentual inesperado do TSE: ${JSON.stringify(valor)}`);
  }
  return Number(normalizado);
}

/** Texto do TSE: `''` vira `null` (o TSE usa string vazia onde queremos ausência). */
export function texto(valor: string | undefined | null): string | null {
  if (valor === undefined || valor === null) return null;
  const t = valor.trim();
  return t === "" ? null : t;
}

/** Flag `"s"`/`"n"` do TSE → boolean. Qualquer outra coisa (inclusive `''`) → `false`. */
export function flag(valor: string | undefined | null): boolean {
  return valor?.trim().toLowerCase() === "s";
}

/**
 * `dd/mm/aaaa` + `hh:mm:ss` (hora de Brasília, sem fuso no arquivo) → ISO em UTC.
 * Qualquer uma das duas partes ausente → `null`.
 */
export function dataHoraUtc(
  data: string | undefined | null,
  hora: string | undefined | null,
): string | null {
  const d = texto(data);
  const h = texto(hora);
  if (!d || !h) return null;

  const mData = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d);
  const mHora = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(h);
  if (!mData || !mHora) {
    throw new Error(`Data/hora inesperada do TSE: ${JSON.stringify(`${d} ${h}`)}`);
  }

  const [, dia, mes, ano] = mData;
  const [, hh, mm, ss = "00"] = mHora;
  const iso = `${ano}-${mes}-${dia}T${hh}:${mm}:${ss}${OFFSET_BRASILIA}`;
  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) {
    throw new Error(`Data/hora inválida do TSE: ${iso}`);
  }
  return instante.toISOString();
}

/** `dd/mm/aaaa` → `aaaa-mm-dd` (coluna `date`). */
export function dataIso(valor: string | undefined | null): string | null {
  const d = texto(valor);
  if (!d) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d);
  if (!m) throw new Error(`Data inesperada do TSE: ${JSON.stringify(valor)}`);
  return `${m[3]}-${m[2]}-${m[1]}`;
}
