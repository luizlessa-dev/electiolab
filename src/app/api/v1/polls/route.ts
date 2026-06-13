import { createClient } from "@/lib/supabase/server";
import { authenticate, applyRateLimitHeaders } from "@/lib/api-auth";
import { NextResponse } from "next/server";

type PollRow = {
  id: string;
  election_id: string;
  fieldwork_start: string | null;
  fieldwork_end: string | null;
  publication_date: string;
  sample_size: number | null;
  margin_of_error: number | null;
  methodology: string | null;
  scope: string | null;
  poll_type: string | null;
  institute: { id: string; name: string } | null;
  results: Array<{
    candidate_id: string;
    percentage: number;
    candidate: { name: string; party: string | null } | null;
  }>;
};

function toCsv(rows: PollRow[]): string {
  const header = [
    "poll_id",
    "election_id",
    "publication_date",
    "fieldwork_start",
    "fieldwork_end",
    "institute",
    "sample_size",
    "margin_of_error",
    "methodology",
    "scope",
    "poll_type",
    "candidate_name",
    "candidate_party",
    "percentage",
  ].join(",");

  const lines = [header];
  for (const p of rows) {
    for (const r of p.results ?? []) {
      lines.push(
        [
          p.id,
          p.election_id,
          p.publication_date ?? "",
          p.fieldwork_start ?? "",
          p.fieldwork_end ?? "",
          (p.institute?.name ?? "").replace(/[",]/g, ""),
          p.sample_size ?? "",
          p.margin_of_error ?? "",
          (p.methodology ?? "").replace(/[",]/g, ""),
          (p.scope ?? "").replace(/[",]/g, ""),
          (p.poll_type ?? "").replace(/[",]/g, ""),
          (r.candidate?.name ?? "").replace(/[",]/g, ""),
          (r.candidate?.party ?? "").replace(/[",]/g, ""),
          r.percentage ?? "",
        ].join(",")
      );
    }
  }
  return lines.join("\n");
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get("election_id");
  const format = searchParams.get("format") ?? "json";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  const supabase = await createClient();

  let query = supabase
    .from("polls")
    .select(
      `
      id, election_id, fieldwork_start, fieldwork_end, publication_date,
      sample_size, margin_of_error, methodology, scope, poll_type,
      institute:institutes(id, name),
      results:poll_results(candidate_id, percentage, candidate:candidates(name, party))
    `
    )
    .order("publication_date", { ascending: false })
    .limit(limit);

  if (electionId) query = query.eq("election_id", electionId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (format === "csv") {
    if (!auth.authenticated) {
      return NextResponse.json(
        {
          error:
            "Exportação CSV requer autenticação. Gere sua API key em electiolab.com/dashboard/api (plano Pro+).",
        },
        { status: 401 }
      );
    }
    const csv = toCsv((data ?? []) as unknown as PollRow[]);
    const resp = new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="electiolab-polls-${
          new Date().toISOString().slice(0, 10)
        }.csv"`,
      },
    });
    return applyRateLimitHeaders(resp, auth);
  }

  return applyRateLimitHeaders(
    NextResponse.json({ data, count: data?.length ?? 0 }),
    auth
  );
}
