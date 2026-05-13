"use client";

import { useState } from "react";
import { Plus, ChevronRight, Loader2 } from "lucide-react";

export type ElectionCandidate = {
  id: string;
  name: string;
  type: string;
  state: string | null;
  year: number;
  round: number;
};

export type MissingItem = {
  protocolo: string;
  ano: number;
  uf: string;
  cargos: string;
  instituto: string;
  fieldwork_end: string;
  publication_date: string | null;
  sample_size: number | null;
  days_since_fieldwork: number | null;
  election_candidates: ElectionCandidate[];
};

type Toast = { kind: "ok" | "err"; msg: string } | null;

export function MissingSection({
  secret,
  setToast,
}: {
  secret: string;
  setToast: (t: Toast) => void;
}) {
  const [items, setItems] = useState<MissingItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState<MissingItem | null>(null);

  async function load() {
    if (!secret) { setToast({ kind: "err", msg: "Cole o INGEST_SECRET_KEY abaixo primeiro" }); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/poll-drafts?source=missing", {
        headers: { authorization: `Bearer ${secret}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setToast({ kind: "err", msg: json.error ?? `HTTP ${res.status}` });
        return;
      }
      setItems(json.data ?? []);
      setLoaded(true);
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Fila TSE (pesqele_missing)
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1 text-xs hover:bg-accent disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
          {loaded ? "recarregar" : "carregar"}
        </button>
      </div>

      {loaded && items.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Nenhuma pesquisa TSE pendente.
        </p>
      )}

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.slice(0, 50).map((m) => (
            <li key={m.protocolo} className="flex flex-wrap items-center gap-2 rounded border border-border bg-card px-3 py-2 text-xs">
              <code className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-700 dark:text-blue-300">
                {m.protocolo}
              </code>
              <span className="font-mono">{m.uf}</span>
              <span className="font-medium">{m.instituto.slice(0, 30)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-mono">{m.fieldwork_end}</span>
              {m.days_since_fieldwork != null && (
                <span className={`text-muted-foreground ${m.days_since_fieldwork > 30 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                  ({m.days_since_fieldwork}d)
                </span>
              )}
              {m.sample_size && <span className="text-muted-foreground">n={m.sample_size.toLocaleString("pt-BR")}</span>}
              <span className="truncate text-muted-foreground" title={m.cargos}>
                {m.cargos.slice(0, 40)}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {m.election_candidates.length} ele{m.election_candidates.length === 1 ? "ição" : "ições"}
              </span>
              <button
                onClick={() => setOpenForm(m)}
                disabled={!m.election_candidates.length}
                className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                title={m.election_candidates.length ? "Criar draft" : "Sem eleições ativas matching"}
              >
                <Plus className="h-3 w-3" /> draft
              </button>
            </li>
          ))}
          {items.length > 50 && (
            <li className="px-3 py-1 text-xs text-muted-foreground">
              … +{items.length - 50} mais. Use filtros pra ver outros.
            </li>
          )}
        </ul>
      )}

      {openForm && (
        <ManualDraftForm
          missing={openForm}
          secret={secret}
          onClose={() => setOpenForm(null)}
          onSuccess={() => {
            setOpenForm(null);
            setToast({ kind: "ok", msg: "Draft criado" });
            setTimeout(() => location.reload(), 800);
          }}
          onError={(msg) => setToast({ kind: "err", msg })}
        />
      )}
    </section>
  );
}

function ManualDraftForm({
  missing,
  secret,
  onClose,
  onSuccess,
  onError,
}: {
  missing: MissingItem;
  secret: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [electionId, setElectionId] = useState(missing.election_candidates[0]?.id ?? "");
  const [institute, setInstitute] = useState(missing.instituto);
  const [fieldworkStart, setFieldworkStart] = useState("");
  const [fieldworkEnd, setFieldworkEnd] = useState(missing.fieldwork_end);
  const [publicationDate, setPublicationDate] = useState(missing.publication_date ?? missing.fieldwork_end);
  const [sampleSize, setSampleSize] = useState(String(missing.sample_size ?? ""));
  const [marginError, setMarginError] = useState("");
  const [scope, setScope] = useState("1t");
  const [round, setRound] = useState("1");
  const [results, setResults] = useState<Array<{ name: string; pct: string }>>([
    { name: "", pct: "" },
    { name: "", pct: "" },
    { name: "", pct: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [bulkPaste, setBulkPaste] = useState("");
  const [suggestUrl, setSuggestUrl] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestMeta, setSuggestMeta] = useState<{ confidence: string; total: number; excerpt?: string } | null>(null);

  function updateResult(idx: number, key: "name" | "pct", value: string) {
    setResults((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }
  function addRow() {
    setResults((prev) => [...prev, { name: "", pct: "" }]);
  }
  function removeRow(idx: number) {
    setResults((prev) => prev.filter((_, i) => i !== idx));
  }
  async function suggestFromUrl() {
    if (!suggestUrl) return;
    if (!/^https?:\/\/(www\.)?quaest\.com\.br\//i.test(suggestUrl)) {
      onError("URL deve ser de quaest.com.br");
      return;
    }
    setSuggesting(true);
    setSuggestMeta(null);
    try {
      const res = await fetch("/api/admin/scrape-quaest", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
        body: JSON.stringify({ url: suggestUrl }),
      });
      const json = await res.json();
      if (!res.ok) { onError(json.error ?? `HTTP ${res.status}`); return; }
      const cands = (json.candidates ?? []) as Array<{ name: string; pct: number }>;
      if (cands.length === 0) {
        onError("Scraper não encontrou candidatos. Cole manualmente.");
        return;
      }
      setResults(cands.map((c) => ({ name: c.name, pct: String(c.pct) })));
      // Pre-fill detected meta se não estiver setado já
      const det = json.detected ?? {};
      if (det.sample_size && !sampleSize) setSampleSize(String(det.sample_size));
      if (det.margin_of_error && !marginError) setMarginError(String(det.margin_of_error));
      if (det.fieldwork_start && !fieldworkStart) setFieldworkStart(det.fieldwork_start);
      if (det.fieldwork_end) setFieldworkEnd(det.fieldwork_end);
      setSuggestMeta({
        confidence: json.confidence,
        total: cands.length,
        excerpt: json.raw_excerpt?.slice(0, 200),
      });
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSuggesting(false);
    }
  }

  function parseBulkPaste() {
    // Tenta parsear texto colado em formato livre:
    //   "Lula 40", "Lula: 40%", "Lula 40,5", "Lula (40%)", "Lula = 40"
    const lines = bulkPaste.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed: Array<{ name: string; pct: string }> = [];
    for (const line of lines) {
      const m = line.match(/^(.+?)[\s:\-=()]+(\d+[.,]?\d*)\s*%?\s*\)?$/);
      if (m) {
        const name = m[1].replace(/^[•\-*\d+.)]+\s*/, "").trim();
        const pct = m[2].replace(",", ".");
        if (name && pct) parsed.push({ name, pct });
      }
    }
    if (parsed.length) {
      setResults(parsed);
      setBulkPaste("");
    } else {
      onError("Não consegui parsear nenhuma linha. Use formato 'Nome XX%' uma por linha.");
    }
  }

  async function submit() {
    if (!electionId) { onError("Selecione a eleição."); return; }
    if (!institute || !fieldworkEnd) { onError("Instituto e fieldwork_end obrigatórios."); return; }
    const cleanResults = results
      .filter((r) => r.name.trim() && r.pct.trim())
      .map((r) => ({ name: r.name.trim(), pct: parseFloat(r.pct.replace(",", ".")) }))
      .filter((r) => !Number.isNaN(r.pct));
    if (cleanResults.length === 0) { onError("Adicione ao menos 1 candidato com % válido."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/poll-drafts", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
        body: JSON.stringify({
          election_id: electionId,
          source_url: `https://pesquisas-eleitorais.tse.jus.br/?protocolo=${missing.protocolo}`,
          drafts: [{
            institute,
            fieldwork_start: fieldworkStart || undefined,
            fieldwork_end: fieldworkEnd,
            publication_date: publicationDate,
            sample_size: sampleSize ? parseInt(sampleSize) : undefined,
            margin_of_error: marginError ? parseFloat(marginError.replace(",", ".")) : undefined,
            scope,
            round: parseInt(round) || 1,
            results: cleanResults,
          }],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div>
            <h3 className="text-base font-semibold">Novo rascunho de pesquisa</h3>
            <p className="text-xs text-muted-foreground">
              <code className="rounded bg-blue-500/10 px-1 text-blue-700 dark:text-blue-300">
                {missing.protocolo}
              </code>{" "}
              · {missing.instituto.slice(0, 40)} · {missing.uf}
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">✕</button>
        </header>

        <div className="space-y-3 p-4 text-sm">
          <div>
            <label className="block text-xs font-medium uppercase text-muted-foreground">Eleição</label>
            <select
              value={electionId}
              onChange={(e) => setElectionId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              {missing.election_candidates.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.type} · {e.state ?? "BR"} · R{e.round})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase text-muted-foreground">Instituto</label>
              <input
                value={institute}
                onChange={(e) => setInstitute(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase text-muted-foreground">Amostra</label>
              <input
                value={sampleSize}
                onChange={(e) => setSampleSize(e.target.value)}
                placeholder="ex: 2000"
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase text-muted-foreground">Fieldwork start</label>
              <input
                type="date"
                value={fieldworkStart}
                onChange={(e) => setFieldworkStart(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase text-muted-foreground">Fieldwork end *</label>
              <input
                type="date"
                value={fieldworkEnd}
                onChange={(e) => setFieldworkEnd(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase text-muted-foreground">Publicação</label>
              <input
                type="date"
                value={publicationDate}
                onChange={(e) => setPublicationDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase text-muted-foreground">Margem (±pp)</label>
              <input
                value={marginError}
                onChange={(e) => setMarginError(e.target.value)}
                placeholder="ex: 2.2"
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase text-muted-foreground">Scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="1t">1º Turno</option>
                <option value="2t">2º Turno</option>
                <option value="estimulada">Estimulada</option>
                <option value="espontanea">Espontânea</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase text-muted-foreground">Turno</label>
              <select
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </div>
          </div>

          {/* Sugerir de URL Quaest */}
          <details className="rounded-md border border-dashed border-border p-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              🔮 Sugerir da URL Quaest (Genial-Quaest)
            </summary>
            <div className="mt-2 space-y-2">
              <input
                value={suggestUrl}
                onChange={(e) => setSuggestUrl(e.target.value)}
                placeholder="https://quaest.com.br/pesquisa-genial-quaest-..."
                className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs"
              />
              <button
                onClick={suggestFromUrl}
                disabled={suggesting || !suggestUrl}
                type="button"
                className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs hover:bg-secondary/80 disabled:opacity-50"
              >
                {suggesting && <Loader2 className="h-3 w-3 animate-spin" />}
                extrair candidatos
              </button>
              {suggestMeta && (
                <div className="rounded border border-border bg-muted/30 p-2 text-[11px]">
                  <p>
                    <strong>{suggestMeta.total}</strong> candidatos extraídos · confiança:{" "}
                    <code className={
                      suggestMeta.confidence === "high"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : suggestMeta.confidence === "medium"
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-red-700 dark:text-red-300"
                    }>{suggestMeta.confidence}</code>
                  </p>
                  <p className="mt-1 italic text-muted-foreground">
                    Revise os valores abaixo antes de salvar — scraper é heurístico.
                  </p>
                  {suggestMeta.excerpt && (
                    <p className="mt-1 max-h-20 overflow-y-auto text-muted-foreground">
                      <strong>Trecho da fonte:</strong> {suggestMeta.excerpt}…
                    </p>
                  )}
                </div>
              )}
            </div>
          </details>

          {/* Bulk paste */}
          <details className="rounded-md border border-dashed border-border p-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground">📋 Colar candidatos em lote</summary>
            <textarea
              value={bulkPaste}
              onChange={(e) => setBulkPaste(e.target.value)}
              rows={4}
              placeholder={"Lula 40\nFlávio Bolsonaro 34\nCaiado 5,5\nZema 3"}
              className="mt-2 w-full rounded border border-border bg-background p-2 font-mono text-xs"
            />
            <button
              onClick={parseBulkPaste}
              type="button"
              className="mt-2 rounded bg-secondary px-2 py-1 text-xs hover:bg-secondary/80"
            >
              parsear
            </button>
          </details>

          {/* Candidatos */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase text-muted-foreground">
              Candidatos + % ({results.filter((r) => r.name && r.pct).length} preenchidos)
            </label>
            {results.map((r, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  value={r.name}
                  onChange={(e) => updateResult(idx, "name", e.target.value)}
                  placeholder="Nome"
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
                />
                <input
                  value={r.pct}
                  onChange={(e) => updateResult(idx, "pct", e.target.value)}
                  placeholder="%"
                  className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
                />
                <button
                  onClick={() => removeRow(idx)}
                  type="button"
                  className="rounded border border-border px-2 text-muted-foreground hover:bg-accent"
                  title="Remover"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={addRow}
              type="button"
              className="text-xs text-primary hover:underline"
            >
              + adicionar candidato
            </button>
          </div>
        </div>

        <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
            criar draft
          </button>
        </footer>
      </div>
    </div>
  );
}
