import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Mail, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Confirmação de inscrição — Newsletter Sinal Eleitoral",
  description: "Confirmação de inscrição na newsletter Sinal Eleitoral do ElectioLab.",
  robots: { index: false, follow: false },
};

const COPY: Record<string, { icon: "ok" | "warn" | "info"; title: string; body: string }> = {
  success: {
    icon: "ok",
    title: "Inscrição confirmada ✓",
    body:
      "Você está oficialmente inscrito na Sinal Eleitoral. Seu primeiro envio chega na próxima segunda-feira com o resumo da semana.",
  },
  already: {
    icon: "info",
    title: "Você já estava inscrito",
    body:
      "Esse email já foi confirmado anteriormente. Continue de olho na caixa de entrada toda segunda-feira.",
  },
  invalid: {
    icon: "warn",
    title: "Link inválido ou expirado",
    body:
      "O token de confirmação não foi reconhecido. Pode ter expirado, sido usado ou estar mal-formado. Inscreva-se novamente em electiolab.com.",
  },
};

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const state = COPY[sp.status ?? ""] ?? COPY.invalid;
  const Icon =
    state.icon === "ok" ? CheckCircle2 : state.icon === "warn" ? AlertCircle : Mail;
  const colorClass =
    state.icon === "ok"
      ? "text-positive bg-positive/10 border-positive/30"
      : state.icon === "warn"
      ? "text-warning bg-warning/10 border-warning/30"
      : "text-primary bg-primary/10 border-primary/30";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <main className="max-w-md w-full text-center space-y-6">
        <div
          className={`mx-auto w-16 h-16 rounded-full border flex items-center justify-center ${colorClass}`}
        >
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{state.title}</h1>
        <p className="text-base text-muted-foreground leading-relaxed">{state.body}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar pro site
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Acessar Terminal
          </Link>
        </div>
      </main>
    </div>
  );
}
