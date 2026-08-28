/**
 * Formatação de datas sem depender do fuso do runtime.
 *
 * O Postgres devolve colunas `date` como "AAAA-MM-DD". `new Date("2026-08-20")`
 * é interpretado como meia-noite UTC, então `getDate()` no servidor (Vercel, UTC)
 * e no navegador do leitor (BRT, -03) devolvem dias diferentes — o que quebra a
 * hidratação em client components e mostra a data errada em qualquer fuso negativo.
 *
 * As funções abaixo trabalham sobre a string quando ela já vem no formato
 * AAAA-MM-DD (com ou sem parte de hora), evitando qualquer conversão de fuso.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

function parts(value: string | Date): [string, string, string] | null {
  if (value instanceof Date) {
    // Timestamps reais: normaliza para o fuso de Brasília, estável nos dois lados.
    const iso = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(value);
    const m = ISO_DATE.exec(iso);
    return m ? [m[1], m[2], m[3]] : null;
  }
  const m = ISO_DATE.exec(value);
  return m ? [m[1], m[2], m[3]] : null;
}

/** "2026-08-20" → "20/08/2026" */
export function formatDateBR(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const p = parts(value);
  if (!p) return "—";
  const [y, m, d] = p;
  return `${d}/${m}/${y}`;
}

/** "2026-08-20" → "20.08.26" */
export function formatShortDateBR(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const p = parts(value);
  if (!p) return "—";
  const [y, m, d] = p;
  return `${d}.${m}.${y.slice(2)}`;
}

/** "2026-08-20" → "20.08" */
export function formatDayMonthBR(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const p = parts(value);
  if (!p) return "—";
  const [, m, d] = p;
  return `${d}.${m}`;
}
