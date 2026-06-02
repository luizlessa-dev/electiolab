import { authenticate, applyRateLimitHeaders } from "@/lib/api-auth";
import { getApprovalAggregate, getRejectionRanking } from "@/lib/approval-data";
import { NextResponse } from "next/server";

/**
 * GET /api/v1/approval
 *   ?subject=lula              -> avaliação de governo (rating + binary) do sujeito
 *   ?metric=rejection&office=presidente&scope=nacional -> ranking de rejeição
 */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const metric = searchParams.get("metric");

  if (metric === "rejection") {
    const office = searchParams.get("office") ?? "presidente";
    const scope = searchParams.get("scope") ?? "nacional";
    const ranking = await getRejectionRanking(office, scope);
    return applyRateLimitHeaders(NextResponse.json({ data: ranking }), auth);
  }

  const subject = searchParams.get("subject");
  if (!subject) {
    return NextResponse.json(
      {
        error:
          "Parâmetro 'subject' obrigatório (ex.: ?subject=lula) ou use ?metric=rejection.",
      },
      { status: 400 }
    );
  }

  const aggregate = await getApprovalAggregate(subject);
  return applyRateLimitHeaders(NextResponse.json({ data: aggregate }), auth);
}
