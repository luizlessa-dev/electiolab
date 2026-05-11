"use client";

import { useMemo, useState } from "react";
import { Check, X, Trash2, ExternalLink, Filter, Tag } from "lucide-react";

type DraftRow = {
  id: string;
  institute_name: string;
  fieldwork_end: string;
  publication_date: string | null;
  sample_size: number | null;
  scope: string | null;
  round: number;
  tse_protocolo: string | null;
  results: Array<{ name: string; pct: number }>;
  source_url: string;
  source_kind: string;
  status: "pending" | "approved" | "rejected" | "imported";
  notes: string | null;
  election: { name: string; type: string; state: string | null; year: number } | null;
};

type SummaryRow = {
  election_name: string;
  cargo: string;
  state: string | null;
  pending: number;
  approved: number;
  rejected: number;
  imported: number;
  with_tse_match: number;
};

const STATUS_LABEL: Record<DraftRow["status"], string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  imported: "Importado",
};

const STATUS_COLOR: Record<DraftRow["status"], string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  imported: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
};

export function DraftsClient({ drafts, summary }: { drafts: DraftRow[]; summary: SummaryRow[] }) {
  const [filter, setFilter] = useState<"all" | "pending" | "rejected" | "imported">("pending");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return drafts;
    return drafts.filter((d) => d.status === filter);
  }, [drafts, filter]);

  async function action(id: string, body: Record<string, unknown>) {
    if (!secret) { setToast({ kind: "err", msg: "Cole o INGEST_SECRET_KEY abaixo" }); return; }
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/poll-drafts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setToast({ kind: "err", msg: json.error ?? `HTTP ${res.status}` });
      } else {
        setToast({ kind: "ok", msg: json.success ? `Sucesso${json.poll_id ? ` (poll ${json.poll_id.slice(0, 8)})` : ""}` : "ok" });
        setTimeout(() => location.reload(), 800);
      }
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!secret) { setToast({ kind: "err", msg: "Cole o INGEST_SECRET_KEY abaixo" }); return; }
    if (!confirm("Apagar este draft?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/poll-drafts/${id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${secret}` },
      });
      if (!res.ok) {
        const j = await res.json();
        setToast({ kind: "err", msg: j.error ?? `HTTP ${res.status}` });
      } else {
        setToast({ kind: "ok", msg: "Apagado" });
        setTimeout(() => location.reload(), 500);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Rascunhos de pesquisas</h1>
          <p className="text-sm text-muted-foreground">
            Fila editorial vinda de PesqEle/Wikipedia/manual. Aprovar promove a <code>polls</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="rounded-md border border-border bg-background px-3 py-1 text-sm"
          >
            <option value="pending">Pendentes ({drafts.filter((d) => d.status === "pending").length})</option>
            <option value="imported">Importados ({drafts.filter((d) => d.status === "imported").length})</option>
            <option value="rejected">Rejeitados ({drafts.filter((d) => d.status === "rejected").length})</option>
            <option value="all">Todos ({drafts.length})</option>
          </select>
        </div>
      </header>

      <section className="rounded-lg border border-border bg-card p-4">
        <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          INGEST_SECRET_KEY (para autorizar ações)
        </label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="cole o token aqui (não é salvo)"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </section>

      {summary.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Resumo por eleição
          </h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Eleição</th>
                  <th className="px-3 py-2 text-right">Pendente</th>
                  <th className="px-3 py-2 text-right">Importado</th>
                  <th className="px-3 py-2 text-right">Rejeitado</th>
                  <th className="px-3 py-2 text-right">TSE match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.map((s, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{s.election_name}</td>
                    <td className="px-3 py-2 text-right font-mono">{s.pending}</td>
                    <td className="px-3 py-2 text-right font-mono">{s.imported}</td>
                    <td className="px-3 py-2 text-right font-mono">{s.rejected}</td>
                    <td className="px-3 py-2 text-right font-mono">{s.with_tse_match}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Drafts ({filtered.length})
        </h2>
        {filtered.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Sem drafts neste filtro.
          </p>
        )}
        <ul className="space-y-2">
          {filtered.map((d) => {
            const election = d.election;
            return (
              <li key={d.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={`rounded border px-2 py-0.5 text-xs ${STATUS_COLOR[d.status]}`}>
                        {STATUS_LABEL[d.status]}
                      </span>
                      <strong>{d.institute_name}</strong>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-mono text-xs">{d.fieldwork_end}</span>
                      {d.sample_size && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs">n={d.sample_size.toLocaleString("pt-BR")}</span>
                        </>
                      )}
                      {d.tse_protocolo && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-mono text-blue-700 dark:text-blue-300">
                          <Tag className="h-3 w-3" />
                          {d.tse_protocolo}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {election?.name} {election?.state ? `(${election.state})` : ""}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(d.results ?? []).map((r, idx) => (
                        <span key={idx} className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                          {r.name}: <strong>{r.pct.toFixed(1)}%</strong>
                        </span>
                      ))}
                    </div>
                    {d.notes && (
                      <p className="pt-1 text-xs italic text-muted-foreground">📝 {d.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={d.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                    >
                      <ExternalLink className="h-3 w-3" /> fonte
                    </a>
                    {d.status === "pending" && (
                      <>
                        <button
                          disabled={busy === d.id}
                          onClick={() => action(d.id, { action: "approve" })}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check className="h-3 w-3" /> aprovar
                        </button>
                        <button
                          disabled={busy === d.id}
                          onClick={() => action(d.id, { action: "reject" })}
                          className="inline-flex items-center gap-1 rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-700 dark:text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <X className="h-3 w-3" /> rejeitar
                        </button>
                      </>
                    )}
                    <button
                      disabled={busy === d.id}
                      onClick={() => remove(d.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-md border px-4 py-2 text-sm shadow-lg ${
            toast.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
          }`}
        >
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-3 text-xs underline">
            fechar
          </button>
        </div>
      )}
    </div>
  );
}
