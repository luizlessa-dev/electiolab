"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { aprovarSintese, rejeitarSintese, editarSintese } from "./actions";
import type { CandidatoSintese } from "./page";

type Status = "pendente" | "aprovado" | "rejeitado";

type OverviewView = {
  kind: "overview";
  temas: {
    id: string;
    slug: string;
    nome: string;
    ordem: number;
    pendentes: number;
    aprovados: number;
    rejeitados: number;
  }[];
};

type DetailView = {
  kind: "detail";
  tema: { id: string; slug: string; nome: string; descricao_escopo: string };
  candidatos: CandidatoSintese[];
  status: Status;
};

const STATUS_LABEL: Record<Status, string> = { pendente: "Pendente", aprovado: "Aprovado", rejeitado: "Rejeitado" };

export function PlanosSintesesClient({ view }: { view: OverviewView | DetailView }) {
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  if (view.kind === "overview") {
    return <Overview temas={view.temas} />;
  }
  return <Detail view={view} toast={toast} setToast={setToast} />;
}

type ToastState = { kind: "ok" | "err"; msg: string } | null;
type SetToast = (t: ToastState) => void;

function Overview({ temas }: { temas: OverviewView["temas"] }) {
  const totalPendente = temas.reduce((n, t) => n + t.pendentes, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <header>
        <h1 className="text-xl font-bold">Planos de governo — revisão de sínteses</h1>
        <p className="text-sm text-muted-foreground">
          {totalPendente} síntese(s) pendente(s) no total, em {temas.length} temas. Cada síntese é gerada por IA a
          partir dos trechos literais classificados — nada aparece no site até ser aprovado.
        </p>
        <p className="pt-1 text-xs text-muted-foreground">
          <Link href="/dashboard/planos-trechos" className="hover:underline">
            ver trechos literais (matéria-prima, revisão opcional) →
          </Link>
        </p>
      </header>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="py-2 pr-2 font-medium">Tema</th>
            <th className="py-2 px-2 text-right font-medium">Pendente</th>
            <th className="py-2 px-2 text-right font-medium">Aprovado</th>
            <th className="py-2 pl-2 text-right font-medium">Rejeitado</th>
          </tr>
        </thead>
        <tbody>
          {temas.map((t) => (
            <tr key={t.id} className="border-b border-border/50">
              <td className="py-2 pr-2">
                <Link href={`/dashboard/planos-sinteses?tema=${t.slug}`} className="hover:underline">
                  {t.nome}
                </Link>
              </td>
              <td className="py-2 px-2 text-right font-mono tabular-nums">
                {t.pendentes > 0 ? (
                  <Link
                    href={`/dashboard/planos-sinteses?tema=${t.slug}`}
                    className="text-amber-700 hover:underline dark:text-amber-400"
                  >
                    {t.pendentes}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </td>
              <td className="py-2 px-2 text-right font-mono tabular-nums text-muted-foreground">{t.aprovados}</td>
              <td className="py-2 pl-2 text-right font-mono tabular-nums text-muted-foreground">{t.rejeitados}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Detail({ view, toast, setToast }: { view: DetailView; toast: ToastState; setToast: SetToast }) {
  const { tema, candidatos, status } = view;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <Link href="/dashboard/planos-sinteses" className="text-xs text-muted-foreground hover:underline">
          ← temas
        </Link>
        <h1 className="text-xl font-bold">{tema.nome}</h1>
        <p className="text-xs text-muted-foreground">{tema.descricao_escopo}</p>
        <div className="flex gap-3 pt-1 text-xs">
          {(["pendente", "aprovado", "rejeitado"] as Status[]).map((s) => (
            <Link
              key={s}
              href={`/dashboard/planos-sinteses?tema=${tema.slug}&status=${s}`}
              className={s === status ? "font-semibold underline" : "text-muted-foreground hover:underline"}
            >
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </div>
      </header>

      {candidatos.length === 0 && <p className="text-sm text-muted-foreground">Nada aqui.</p>}

      {candidatos.map((c) => (
        <SinteseCard key={c.candidato_id} candidato={c} setToast={setToast} />
      ))}

      <Toast toast={toast} setToast={setToast} />
    </div>
  );
}

function SinteseCard({ candidato, setToast }: { candidato: CandidatoSintese; setToast: SetToast }) {
  const { sintese, trechosFonte } = candidato;
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState(sintese.texto);
  const [textoEstendido, setTextoEstendido] = useState(sintese.texto_estendido);
  const [verEstendido, setVerEstendido] = useState(false);
  const [verFontes, setVerFontes] = useState(false);

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
    <section>
      <h2 className="mb-1 text-sm font-semibold">{candidato.candidato_nome}</h2>

      {editing ? (
        <div className="space-y-2">
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">curto</p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={Math.max(3, Math.ceil(texto.length / 70))}
              className="w-full rounded-md border border-border bg-background p-2 text-sm"
            />
          </div>
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">completo</p>
            <textarea
              value={textoEstendido}
              onChange={(e) => setTextoEstendido(e.target.value)}
              rows={Math.max(4, Math.ceil(textoEstendido.length / 70))}
              className="w-full rounded-md border border-border bg-background p-2 text-sm"
            />
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed">{texto}</p>
          {verEstendido && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {textoEstendido}
            </p>
          )}
        </>
      )}

      <p className="mt-1 text-xs text-muted-foreground">
        p. {sintese.paginas_referencia.join(", ")}
        {sintese.status !== "pendente" && !editing && <> · {STATUS_LABEL[sintese.status]}</>}
        {sintese.revisado_por && !editing && <> · revisado por {sintese.revisado_por}</>}
        {" · "}
        {editing ? (
          <>
            <button
              disabled={isPending}
              onClick={() =>
                run(async () => {
                  await editarSintese(sintese.id, texto, textoEstendido);
                  setEditing(false);
                }, "Síntese editada")
              }
              className="text-foreground underline disabled:opacity-50"
            >
              salvar
            </button>{" "}
            ·{" "}
            <button
              disabled={isPending}
              onClick={() => {
                setTexto(sintese.texto);
                setTextoEstendido(sintese.texto_estendido);
                setEditing(false);
              }}
              className="underline disabled:opacity-50"
            >
              cancelar
            </button>
          </>
        ) : (
          <>
            {sintese.status === "pendente" && (
              <>
                <button
                  disabled={isPending}
                  onClick={() => run(() => aprovarSintese(sintese.id), "Aprovado")}
                  className="text-emerald-700 underline disabled:opacity-50 dark:text-emerald-400"
                >
                  aprovar
                </button>{" "}
                ·{" "}
                <button
                  disabled={isPending}
                  onClick={() => run(() => rejeitarSintese(sintese.id), "Rejeitado")}
                  className="text-red-700 underline disabled:opacity-50 dark:text-red-400"
                >
                  rejeitar
                </button>{" "}
                ·{" "}
              </>
            )}
            <button disabled={isPending} onClick={() => setEditing(true)} className="underline disabled:opacity-50">
              editar
            </button>{" "}
            ·{" "}
            <button onClick={() => setVerEstendido((v) => !v)} className="underline">
              {verEstendido ? "ocultar" : "ver"} versão completa
            </button>{" "}
            ·{" "}
            <button onClick={() => setVerFontes((v) => !v)} className="underline">
              {verFontes ? "ocultar" : "ver"} trechos originais ({trechosFonte.length})
            </button>
          </>
        )}
      </p>

      {verFontes && !editing && (
        <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
          {trechosFonte.map((t, i) => (
            <p key={i} className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-mono">p.{t.pagina}</span> — {t.texto}
            </p>
          ))}
        </div>
      )}
    </section>
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
