"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, X, Pencil, ExternalLink, User } from "lucide-react";
import { aprovarTrecho, rejeitarTrecho, editarTrecho } from "./actions";
import type { Trecho, CandidatoBlock } from "./page";

type Status = "pendente" | "aprovado" | "rejeitado";

type OverviewView = {
  kind: "overview";
  temas: { id: string; slug: string; nome: string; ordem: number; pendentes: number }[];
};

type DetailView = {
  kind: "detail";
  tema: { id: string; slug: string; nome: string; descricao_escopo: string };
  blocks: CandidatoBlock[];
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
  const { tema, blocks, status } = view;
  const totalTrechos = blocks.reduce((n, b) => n + b.trechos.length, 0);

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
        {totalTrechos} trecho(s) {STATUS_LABEL[status].toLowerCase()} em {blocks.length} candidato(s)
      </p>

      {blocks.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nada aqui.
        </p>
      )}

      <div className="space-y-6">
        {blocks.map((b) => (
          <CandidatoSection key={b.candidato_id} block={b} setToast={setToast} />
        ))}
      </div>

      <Toast toast={toast} setToast={setToast} />
    </div>
  );
}

function CandidatoSection({ block, setToast }: { block: CandidatoBlock; setToast: SetToast }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
          {block.photo_url ? (
            <Image src={block.photo_url} alt={block.candidato_nome} fill sizes="40px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <User className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{block.candidato_nome}</h2>
        </div>
        {block.url_origem && (
          <a
            href={block.url_origem}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> fonte (zip)
          </a>
        )}
      </div>

      <ul className="divide-y divide-border">
        {block.trechos.map((t) => (
          <TrechoCard key={t.id} trecho={t} setToast={setToast} />
        ))}
      </ul>
    </section>
  );
}

function TrechoCard({ trecho, setToast }: { trecho: Trecho; setToast: SetToast }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState(trecho.texto);

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
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>página {trecho.pagina}</span>
            {trecho.revisado_por && (
              <span className="italic">
                — revisado por {trecho.revisado_por} em {new Date(trecho.revisado_em!).toLocaleString("pt-BR")}
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
            <p className="whitespace-pre-wrap text-sm">{trecho.texto}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {editing ? (
            <>
              <button
                disabled={isPending}
                onClick={() =>
                  run(async () => {
                    await editarTrecho(trecho.id, texto);
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
                  setTexto(trecho.texto);
                  setEditing(false);
                }}
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
              >
                cancelar
              </button>
            </>
          ) : (
            <>
              {trecho.status === "pendente" && (
                <>
                  <button
                    disabled={isPending}
                    onClick={() => run(() => aprovarTrecho(trecho.id), "Aprovado")}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" /> aprovar
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => run(() => rejeitarTrecho(trecho.id), "Rejeitado")}
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
