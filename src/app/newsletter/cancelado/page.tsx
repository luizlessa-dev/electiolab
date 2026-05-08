import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, AlertCircle, ArrowLeft, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Inscrição cancelada — Sinal Eleitoral",
  robots: { index: false, follow: false },
};

const COPY: Record<string, { icon: "ok" | "warn"; title: string; body: string }> = {
  success: {
    icon: "ok",
    title: "Inscrição cancelada",
    body:
      "Pronto. Você não vai mais receber a Sinal Eleitoral. Se mudar de ideia, é só inscrever de novo em electiolab.com.",
  },
  invalid: {
    icon: "warn",
    title: "Link inválido",
    body:
      "O ID de cancelamento não foi reconhecido. Se esse problema persistir, escreva pra privacidade@electiolab.com com o assunto 'LGPD: cancelar newsletter'.",
  },
  error: {
    icon: "warn",
    title: "Erro inesperado",
    body:
      "Algo deu errado ao processar seu cancelamento. Por favor escreva pra privacidade@electiolab.com com seu email cadastrado.",
  },
};

export default async function CanceladoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const state = COPY[sp.status ?? ""] ?? COPY.invalid;
  const Icon = state.icon === "ok" ? CheckCircle2 : AlertCircle;
  const colorClass =
    state.icon === "ok"
      ? "text-positive bg-positive/10 border-positive/30"
      : "text-warning bg-warning/10 border-warning/30";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <main className="max-w-md w-full text-center space-y-6">
        <div className={`mx-auto w-16 h-16 rounded-full border flex items-center justify-center ${colorClass}`}>
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{state.title}</h1>
        <p className="text-base text-muted-foreground leading-relaxed">{state.body}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar pro site
        </Link>
      </main>
    </div>
  );
}
