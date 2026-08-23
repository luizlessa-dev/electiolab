"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Pencil, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { aprovarTrecho, rejeitarTrecho, editarTrecho } from "./actions";
import type { TrechoRow } from "./page";

type Status = "pendente" | "aprovado" | "rejeitado";

type OverviewView = {
  kind: "overview";
  temas: { id: string; slug: string; nome: string; ordem: number; pendentes: number }[];
};

type DetailView = {
  kind: "detail";
  tema: { id: string; slug: string; nome: string; descricao_escopo: string };
  rows: TrechoRow[];
  total: number;
  page: number;
  pageSize: number;
  status: Status;
};

const STATUS_LABEL: Record<Status, string> = { pendente: "Pendente", aprovado: "Aprovado", rejeitado: "Rejeitado" };

export function PlanosTrechosClient({ view }: { view: OverviewView | DetailView }) {
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  if (view.kind === "overview") {
    return <Overview temas={view.temas} toast={toast} setToast={setToast} />;
  }
  return <Detail view={view} toast={toast} setToast={setToast} />;
}

type ToastState = { kind: "ok" | "err"; msg: string } | null;
type SetToast = (t: ToastState) => void;

function Overview({
  temas,
  toast,
  setToast,
}: {
  temas: OverviewView["temas"];
  toast: ToastState;
  setToast: SetToast;
}) {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Planos de governo — revisão de trechos</h1>
        <p className="text-sm text-muted-foreground">
          Trechos classificados por tema automaticamente (palavra-chave + LLM). Nada aqui aparece no site até ser
          aprovado.
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Tema</th>
              <th className="px-3 py-2 text-right">Pendentes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {temas.map((t) => (
              <tr key={t.id}>
                <td className="px-3 py-2">
                  <Link href={`/dashboard/planos-trechos?tema=${t.slug}`} className="hover:underline">
                    {t.nome}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right">
                  {t.pendentes > 0 ? (
                    <Link
                      href={`/dashboard/planos-trechos?tema=${t.slug}`}
                      className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-700 hover:underline dark:text-amber-300"
                    >
                      {t.pendentes}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Toast toast={toast} setToast={setToast} />
    </div>
  );
}

function Detail({ view, toast, setToast }: { view: DetailView; toast: ToastState; setToast: SetToast }) {
  const { tema, rows, total, page, pageSize, status } = view;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <Link href="/dashboard/planos-trechos" className="text-xs text-muted-foreground hover:underline">
          ← voltar pros temas
        </Link>
        <h1 className="text-2xl font-bold">{tema.nome}</h1>
        <p className="max-w-3xl text-xs text-muted-foreground">{tema.descricao_escopo}</p>
        <div className="flex gap-2 pt-1">
          {(["pendente", "aprovado", "rejeitado"] as Status[]).map((s) => (
            <Link
              key={s}
              href={`/dashboard/planos-trechos?tema=${tema.slug}&status=${s}`}
              className={`rounded-md border px-2 py-1 text-xs ${
                s === status ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-accent"
              }`}
            >
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </div>
      </header>

      <p className="text-sm text-muted-foreground">
        {total} trecho(s) {STATUS_LABEL[status].toLowerCase()}
        {totalPages > 1 ? ` — página ${page} de ${totalPages}` : ""}
      </p>

      {rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nada aqui.
        </p>
      )}

      <ul className="space-y-3">
        {rows.map((r) => (
          <TrechoCard key={r.id} row={r} setToast={setToast} />
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/dashboard/planos-trechos?tema=${tema.slug}&status=${status}&page=${page - 1}`}
            aria-disabled={page <= 1}
            className={`inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs ${
              page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-accent"
            }`}
          >
            <ChevronLeft className="h-3 w-3" /> anterior
          </Link>
          <Link
            href={`/dashboard/planos-trechos?tema=${tema.slug}&status=${status}&page=${page + 1}`}
            aria-disabled={page >= totalPages}
            className={`inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs ${
              page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-accent"
            }`}
          >
            próxima <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <Toast toast={toast} setToast={setToast} />
    </div>
  );
}

function TrechoCard({ row, setToast }: { row: TrechoRow; setToast: SetToast }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState(row.texto);

  function run(fn: () => Promise<void>, okMsg: string) {
    startTransition(async () => {
      try {
        await fn();
        setToast({ kind: "ok", msg: okMsg });
      } catch (e) {
        setToast({ kind: "err", msg: (e as Error).message });
      }
    });
  }

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <strong className="text-foreground">{row.candidato_nome}</strong>
            <span>·</span>
            <span>página {row.pagina}</span>
            {row.url_origem && (
              <a
                href={row.url_origem}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> fonte (zip)
              </a>
            )}
            {row.revisado_por && (
              <span className="italic">
                — revisado por {row.revisado_por} em {new Date(row.revisado_em!).toLocaleString("pt-BR")}
              </span>
            )}
          </div>

          {editing ? (
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={Math.max(3, Math.ceil(texto.length / 90))}
              className="w-full rounded-md border border-border bg-background p-2 text-sm"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm">{row.texto}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {editing ? (
            <>
              <button
                disabled={isPending}
                onClick={() =>
                  run(async () => {
                    await editarTrecho(row.id, texto);
                    setEditing(false);
                  }, "Trecho editado")
                }
                className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
              >
                salvar
              </button>
              <button
                disabled={isPending}
                onClick={() => {
                  setTexto(row.texto);
                  setEditing(false);
                }}
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
              >
                cancelar
              </button>
            </>
          ) : (
            <>
              {row.status === "pendente" && (
                <>
                  <button
                    disabled={isPending}
                    onClick={() => run(() => aprovarTrecho(row.id), "Aprovado")}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" /> aprovar
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => run(() => rejeitarTrecho(row.id), "Rejeitado")}
                    className="inline-flex items-center gap-1 rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-700 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
                  >
                    <X className="h-3 w-3" /> rejeitar
                  </button>
                </>
              )}
              <button
                disabled={isPending}
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
              >
                <Pencil className="h-3 w-3" /> editar
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function Toast({ toast, setToast }: { toast: ToastState; setToast: SetToast }) {
  if (!toast) return null;
  return (
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
  );
}
