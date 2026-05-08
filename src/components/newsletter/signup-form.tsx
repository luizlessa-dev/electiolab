"use client";

import { useState } from "react";
import { Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  variant?: "inline" | "card" | "footer";
  source?: string; // pra rastrear onde o user assinou
}

export function NewsletterSignup({ variant = "card", source = "site" }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao inscrever");
      setState("success");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  if (state === "success") {
    return (
      <div className={
        variant === "inline"
          ? "flex items-center gap-2 text-sm text-positive"
          : "flex items-start gap-2 p-3 rounded-md bg-positive/10 border border-positive/30 text-sm text-positive"
      }>
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Quase lá!</p>
          <p className="text-xs opacity-90 mt-0.5">
            Enviamos um email de confirmação pra <strong>{email}</strong>. Clique no link
            de lá pra ativar sua inscrição.
          </p>
        </div>
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          className="flex-1 px-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assinar"}
        </button>
      </form>
    );
  }

  if (variant === "inline") {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          className="flex-1 px-3 py-1.5 rounded-md text-sm bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          Assinar
        </button>
        {state === "error" && (
          <span className="text-xs text-negative flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errorMsg}
          </span>
        )}
      </form>
    );
  }

  // variant === "card"
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Sinal Eleitoral</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Newsletter semanal — média ponderada, ranking de institutos, insights cruzados.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          className="w-full px-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {state === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Inscrevendo...
            </>
          ) : (
            "Assinar grátis"
          )}
        </button>
        {state === "error" && (
          <p className="text-xs text-negative flex items-center gap-1 mt-2">
            <AlertCircle className="h-3 w-3" /> {errorMsg}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Sem spam. Cancele a qualquer momento.
        </p>
      </form>
    </div>
  );
}
