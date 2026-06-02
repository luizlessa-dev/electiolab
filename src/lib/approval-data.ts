/**
 * Agregação de pesquisas de AVALIAÇÃO DE GOVERNO e REJEIÇÃO.
 *
 * Lê a tabela approval_polls e calcula a média ponderada de cada dimensão
 * reusando o mesmo motor de src/lib/weighting/ (recência × amostra × metodologia
 * × acurácia do instituto) usado para intenção de voto.
 *
 * As três métricas (rating, binary, rejection) são agregadas SEPARADAMENTE —
 * cada uma só dentro do seu grupo comparável. Se a tabela não existir ou não
 * houver dados, retorna null (as páginas exibem empty-state).
 */
import { createClient } from "@supabase/supabase-js";
import {
  calculateWeightedAverage,
  type PollInput,
} from "@/lib/weighting/calculate-weighted-average";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

type Methodology = "presencial" | "telefonica" | "online" | "mista";

type ApprovalPollRow = {
  id: string;
  institute_name: string;
  subject_label: string;
  subject_slug: string | null;
  office: string;
  scope: string;
  metric: "rating" | "binary" | "rejection";
  publication_date: string;
  fieldwork_end: string | null;
  sample_size: number | null;
  margin_of_error: number | null;
  methodology: string | null;
  source_url: string | null;
  pct_otimo: number | null;
  pct_bom: number | null;
  pct_regular: number | null;
  pct_ruim: number | null;
  pct_pessimo: number | null;
  pct_aprova: number | null;
  pct_desaprova: number | null;
  pct_rejeita: number | null;
  pct_nsnr: number | null;
  institute:
    | { reliability_score: number | null }
    | { reliability_score: number | null }[]
    | null;
};

const SELECT_COLS = `
  id, institute_name, subject_label, subject_slug, office, scope, metric,
  publication_date, fieldwork_end, sample_size, margin_of_error, methodology, source_url,
  pct_otimo, pct_bom, pct_regular, pct_ruim, pct_pessimo,
  pct_aprova, pct_desaprova, pct_rejeita, pct_nsnr,
  institute:institutes(reliability_score)
`;

const VALID_METHODS = ["presencial", "telefonica", "online", "mista"];

function toPollInput(row: ApprovalPollRow, pct: number): PollInput {
  const inst = Array.isArray(row.institute) ? row.institute[0] : row.institute;
  const reliability =
    inst?.reliability_score != null ? Number(inst.reliability_score) : 0.7;
  const methodology = (
    VALID_METHODS.includes(row.methodology ?? "") ? row.methodology : "mista"
  ) as Methodology;
  return {
    id: row.id,
    fieldworkEnd: new Date(row.fieldwork_end ?? row.publication_date),
    sampleSize: row.sample_size ?? 1000,
    methodology,
    instituteReliability: reliability,
    percentage: pct,
  };
}

export type ApprovalDimension = {
  label: string;
  value: number;
  ciLow: number;
  ciHigh: number;
};

function aggregateDimension(
  rows: ApprovalPollRow[],
  key: keyof ApprovalPollRow,
  label: string
): ApprovalDimension {
  const inputs = rows
    .filter((r) => r[key] != null)
    .map((r) => toPollInput(r, Number(r[key])));
  const res = calculateWeightedAverage(inputs);
  return {
    label,
    value: res.average,
    ciLow: res.confidenceLow,
    ciHigh: res.confidenceHigh,
  };
}

const RATING_DIMS: { key: keyof ApprovalPollRow; label: string }[] = [
  { key: "pct_otimo", label: "Ótimo" },
  { key: "pct_bom", label: "Bom" },
  { key: "pct_regular", label: "Regular" },
  { key: "pct_ruim", label: "Ruim" },
  { key: "pct_pessimo", label: "Péssimo" },
];

export type ApprovalAggregate = {
  subjectLabel: string;
  subjectSlug: string;
  office: string;
  scope: string;
  pollCount: number;
  latestDate: string | null;
  rating: ApprovalDimension[] | null;
  ratingPositive: number | null; // ótimo + bom
  ratingNegative: number | null; // ruim + péssimo
  binary: { aprova: ApprovalDimension; desaprova: ApprovalDimension } | null;
  institutes: string[];
};

/** Agregado de avaliação de governo (rating + binary) para um sujeito. */
export async function getApprovalAggregate(
  subjectSlug: string
): Promise<ApprovalAggregate | null> {
  const { data } = await sb()
    .from("approval_polls")
    .select(SELECT_COLS)
    .eq("subject_slug", subjectSlug)
    .in("metric", ["rating", "binary"])
    .order("publication_date", { ascending: false });

  const rows = (data ?? []) as unknown as ApprovalPollRow[];
  if (rows.length === 0) return null;

  const ratingRows = rows.filter((r) => r.metric === "rating");
  const binaryRows = rows.filter((r) => r.metric === "binary");

  const rating = ratingRows.length
    ? RATING_DIMS.map((d) => aggregateDimension(ratingRows, d.key, d.label))
    : null;
  const ratingPositive = rating
    ? Math.round((rating[0].value + rating[1].value) * 10) / 10
    : null;
  const ratingNegative = rating
    ? Math.round((rating[3].value + rating[4].value) * 10) / 10
    : null;

  const binary = binaryRows.length
    ? {
        aprova: aggregateDimension(binaryRows, "pct_aprova", "Aprova"),
        desaprova: aggregateDimension(binaryRows, "pct_desaprova", "Desaprova"),
      }
    : null;

  return {
    subjectLabel: rows[0].subject_label,
    subjectSlug,
    office: rows[0].office,
    scope: rows[0].scope,
    pollCount: rows.length,
    latestDate: rows[0].publication_date,
    rating,
    ratingPositive,
    ratingNegative,
    binary,
    institutes: [...new Set(rows.map((r) => r.institute_name))],
  };
}

export type RejectionEntry = {
  subjectLabel: string;
  subjectSlug: string | null;
  value: number;
  ciLow: number;
  ciHigh: number;
  pollCount: number;
};

export type RejectionRanking = {
  entries: RejectionEntry[];
  pollCount: number;
  latestDate: string | null;
  institutes: string[];
};

/** Ranking de rejeição (% que não votaria) por candidato, para um cargo/escopo. */
export async function getRejectionRanking(
  office = "presidente",
  scope = "nacional"
): Promise<RejectionRanking | null> {
  const { data } = await sb()
    .from("approval_polls")
    .select(SELECT_COLS)
    .eq("metric", "rejection")
    .eq("office", office)
    .eq("scope", scope)
    .order("publication_date", { ascending: false });

  const rows = (data ?? []) as unknown as ApprovalPollRow[];
  if (rows.length === 0) return null;

  const bySubject = new Map<string, ApprovalPollRow[]>();
  for (const r of rows) {
    const list = bySubject.get(r.subject_label) ?? [];
    list.push(r);
    bySubject.set(r.subject_label, list);
  }

  const entries: RejectionEntry[] = [];
  for (const [label, subjectRows] of bySubject) {
    const dim = aggregateDimension(subjectRows, "pct_rejeita", label);
    entries.push({
      subjectLabel: label,
      subjectSlug: subjectRows[0].subject_slug,
      value: dim.value,
      ciLow: dim.ciLow,
      ciHigh: dim.ciHigh,
      pollCount: subjectRows.length,
    });
  }
  entries.sort((a, b) => b.value - a.value);

  return {
    entries,
    pollCount: rows.length,
    latestDate: rows[0].publication_date,
    institutes: [...new Set(rows.map((r) => r.institute_name))],
  };
}
