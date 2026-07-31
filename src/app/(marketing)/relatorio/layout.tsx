import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Lock } from "lucide-react";

export default async function RelatorioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/relatorio");
  }

  const { data: apiKey } = await sb
    .from("api_keys")
    .select("tier, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  const isPro =
    apiKey?.is_active &&
    ["pro", "business", "enterprise"].includes(apiKey.tier as string);

  if (!isPro) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5 py-16">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">
              Relatório semanal — plano Pro+
            </h2>
            <p className="text-sm text-muted-foreground">
              Os relatórios semanais de agregação com análise editorial são
              exclusivos dos planos Pro e Business.
            </p>
          </div>
          <Link
            href="/precos"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Ver planos →
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
