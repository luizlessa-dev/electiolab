/**
 * Página otimizada pra embed em iframes externos.
 *
 * Uso:
 *   <iframe src="https://electiolab.com/embed/eleicao/{id}?theme=light&size=md" />
 *
 * OU via script:
 *   <div data-electiolab-eleicao="{id}" data-theme="light" data-size="md"></div>
 *   <script src="https://electiolab.com/embed.js" async></script>
 */

import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Average = {
  weighted_average: number;
  candidate: { name: string; party: string | null; color: string | null; slug: string };
};

async function getData(id: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: election } = await sb
    .from("elections")
    .select("id, name, type, state, year, election_date")
    .eq("id", id)
    .maybeSingle();
  if (!election) return null;

  const { data: averages } = await sb
    .from("weighted_averages")
    .select(
      "weighted_average, candidate:candidates(name, party, color, slug)"
    )
    .eq("election_id", id)
    .order("weighted_average", { ascending: false })
    .limit(8);

  const { data: pollsCount } = await sb
    .from("polls")
    .select("id", { count: "exact", head: true })
    .eq("election_id", id)
    .eq("round", 1);

  const flat: Average[] = ((averages ?? []) as unknown as Array<{
    weighted_average: number;
    candidate: { name: string; party: string | null; color: string | null; slug: string }[] | { name: string; party: string | null; color: string | null; slug: string };
  }>).map((a) => ({
    weighted_average: a.weighted_average,
    candidate: Array.isArray(a.candidate) ? a.candidate[0] : a.candidate,
  }));

  return {
    election,
    averages: flat,
    polls_count: (pollsCount as unknown as { count?: number })?.count ?? 0,
  };
}

export const metadata: Metadata = {
  robots: { index: false, follow: false }, // Embed pages não devem aparecer no search
};

export default async function EmbedEleicaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ theme?: string; size?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const theme = sp.theme === "dark" ? "dark" : "light";
  const size = sp.size === "sm" ? "sm" : sp.size === "lg" ? "lg" : "md";

  const data = await getData(id);

  if (!data) {
    return (
      <div className={`embed-frame ${theme}`}>
        <div className="p-6 text-center text-sm text-neutral-500">
          Eleição não encontrada
        </div>
        <EmbedStyles />
      </div>
    );
  }

  const { election, averages, polls_count } = data;
  const total = averages.reduce((s, a) => s + (a.weighted_average ?? 0), 0);

  return (
    <div className={`embed-frame embed-frame--${size} embed-frame--${theme}`}>
      <header className="embed-header">
        <div>
          <p className="embed-eyebrow">
            ElectioLab · Média ponderada
          </p>
          <h1 className="embed-title">{election.name}</h1>
        </div>
        <a
          href={`https://electiolab.com/dashboard?election=${election.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="embed-cta"
        >
          ver no ElectioLab →
        </a>
      </header>

      <div className="embed-body">
        {averages.length === 0 ? (
          <p className="embed-empty">Sem dados de pesquisa ainda.</p>
        ) : (
          <ul className="embed-list">
            {averages.slice(0, size === "sm" ? 5 : 8).map((a, i) => {
              const pct = a.weighted_average ?? 0;
              const widthPct = total > 0 ? (pct / Math.max(...averages.map((x) => x.weighted_average ?? 0))) * 100 : 0;
              return (
                <li key={i} className="embed-item">
                  <div className="embed-item-row">
                    <span className="embed-name">
                      {a.candidate?.name ?? "—"}
                      {a.candidate?.party && (
                        <span className="embed-party"> · {a.candidate.party}</span>
                      )}
                    </span>
                    <span
                      className="embed-pct"
                      style={{ color: a.candidate?.color ?? undefined }}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="embed-bar">
                    <div
                      className="embed-bar-fill"
                      style={{
                        width: `${widthPct}%`,
                        background: a.candidate?.color ?? "#6b7280",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="embed-footer">
        <span>
          {polls_count} pesquisa{polls_count === 1 ? "" : "s"} · atualizado{" "}
          {new Date().toLocaleDateString("pt-BR")}
        </span>
        <a
          href="https://electiolab.com"
          target="_blank"
          rel="noopener noreferrer"
          className="embed-brand"
        >
          electiolab.com
        </a>
      </footer>

      <EmbedStyles />
    </div>
  );
}

function EmbedStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        html, body { margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
        .embed-frame {
          --bg: #ffffff;
          --border: #e5e7eb;
          --text: #111827;
          --muted: #525252;
          --accent: #2563eb;
          --bar-bg: #f3f4f6;
          padding: 16px;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          box-sizing: border-box;
          font-size: 14px;
          line-height: 1.5;
        }
        .embed-frame--dark {
          --bg: #0b1220;
          --border: #1f2937;
          --text: #f9fafb;
          --muted: #9ca3af;
          --accent: #60a5fa;
          --bar-bg: #1f2937;
        }
        .embed-frame--sm { font-size: 12px; padding: 12px; }
        .embed-frame--lg { font-size: 16px; padding: 24px; }
        .embed-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }
        .embed-eyebrow {
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--muted);
          margin: 0 0 4px 0;
          font-weight: 500;
        }
        .embed-title {
          font-size: 1em;
          font-weight: 700;
          margin: 0;
          line-height: 1.2;
        }
        .embed-cta {
          font-size: 0.75em;
          color: var(--accent);
          text-decoration: none;
          white-space: nowrap;
        }
        .embed-cta:hover { text-decoration: underline; }
        .embed-body { margin-bottom: 12px; }
        .embed-empty {
          text-align: center;
          color: var(--muted);
          padding: 24px 0;
          margin: 0;
        }
        .embed-list { list-style: none; margin: 0; padding: 0; }
        .embed-item { padding: 6px 0; }
        .embed-item-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
        }
        .embed-name {
          font-weight: 500;
          color: var(--text);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .embed-party {
          font-size: 0.85em;
          color: var(--muted);
          font-weight: 400;
        }
        .embed-pct {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .embed-bar {
          height: 4px;
          background: var(--bar-bg);
          border-radius: 2px;
          overflow: hidden;
        }
        .embed-bar-fill {
          height: 100%;
          transition: width 0.5s ease;
        }
        .embed-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid var(--border);
          font-size: 0.7em;
          color: var(--muted);
        }
        .embed-brand {
          color: var(--accent);
          text-decoration: none;
          font-weight: 500;
        }
        .embed-brand:hover { text-decoration: underline; }
      `,
      }}
    />
  );
}
