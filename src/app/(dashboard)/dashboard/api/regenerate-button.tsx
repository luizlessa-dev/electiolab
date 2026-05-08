"use client";

import { useState } from "react";
import { RefreshCw, Copy, Check, AlertCircle, Loader2 } from "lucide-react";

export function RegenerateKeyButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleRegenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/api-key/regenerate", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro inesperado");
      setNewKey(json.api_key);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (newKey) {
    return (
      <div className="w-full space-y-3 p-4 rounded-md bg-warning/5 border border-warning/30">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-warning shrink-0" />
          <p className="text-sm font-medium">
            Copie agora — esta key não será exibida novamente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 rounded-md bg-background border border-border text-xs font-mono break-all">
            {newKey}
          </code>
          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center gap-1.5 shrink-0"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <button
          onClick={() => {
            setNewKey(null);
            window.location.reload();
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Já guardei, fechar
        </button>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="px-3 py-2 rounded-md text-xs font-medium border border-border hover:bg-muted/50"
        >
          Cancelar
        </button>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="px-3 py-2 rounded-md bg-warning text-warning-foreground text-xs font-medium hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Confirmar regeneração
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0">
      <button
        onClick={() => setConfirming(true)}
        className="px-4 py-2 rounded-md text-xs font-medium border border-border hover:bg-muted/50 flex items-center gap-1.5"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Regenerar
      </button>
      {error && (
        <p className="text-xs text-negative mt-2 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}
