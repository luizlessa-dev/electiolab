import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { Resend } from "resend";

const admin = () =>
  createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "ElectioLab <noreply@electiolab.com>";

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * POST /api/account/api-key/regenerate
 *
 * Regenera a API key do usuário autenticado. Substitui o key_hash no banco
 * (invalidando a key anterior) e retorna a nova key — única vez que aparece
 * em texto puro.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Busca key existente do usuário
  const { data: existing } = await admin()
    .from("api_keys")
    .select("id, tier, rate_limit, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing || !existing.is_active) {
    return NextResponse.json(
      {
        error:
          "Você ainda não tem assinatura ativa. Assine um plano em /precos para gerar sua API key.",
      },
      { status: 403 }
    );
  }

  // Gera nova key
  const tier = existing.tier as string;
  const newKey = `el_${tier}_${crypto.randomUUID().replace(/-/g, "")}`;
  const newHash = await sha256(newKey);

  const { error } = await admin()
    .from("api_keys")
    .update({
      key_hash: newHash,
      requests_used: 0,
      period_start: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Email com a nova key + alerta da invalidação anterior
  if (user.email && resend) {
    const rateLimit = existing.rate_limit ?? 1000;
    await resend.emails
      .send({
        from: FROM_EMAIL,
        to: user.email,
        subject: "ElectioLab — API key regenerada",
        html: `
          <div style="font-family: ui-sans-serif, system-ui; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #2563eb;">Sua API key foi regenerada</h2>
            <p>
              Solicitamos a regeneração da sua API key. A <strong>chave anterior foi invalidada
              imediatamente</strong> e não funcionará mais. Use a nova abaixo:
            </p>
            <pre style="background: #f4f4f5; padding: 16px; border-radius: 6px; font-size: 13px; overflow-x: auto; word-break: break-all;">${newKey}</pre>
            <p style="color: #525252; font-size: 14px;">
              <strong>⚠️ Importante:</strong> guarde essa chave em local seguro.
              Ela não será exibida novamente.
            </p>
            <h3 style="margin-top: 24px;">Como usar</h3>
            <pre style="background: #f4f4f5; padding: 16px; border-radius: 6px; font-size: 13px; overflow-x: auto;">curl https://electiolab.com/api/v1/averages \\
  -H "Authorization: Bearer ${newKey}"</pre>
            <p style="color: #525252; font-size: 14px;">
              Plano: <strong>${tier.toUpperCase()}</strong> · Limite:
              <strong>${rateLimit.toLocaleString("pt-BR")} requisições/mês</strong> ·
              Contador zerado no momento da regeneração.
            </p>
            <p style="color: #b91c1c; font-size: 13px; margin-top: 16px; padding: 12px; background: #fef2f2; border-radius: 6px; border: 1px solid #fecaca;">
              Se você <strong>não solicitou</strong> esta regeneração, sua conta pode ter sido
              acessada. Troque sua senha em /auth/login e nos contate em
              <a href="mailto:contato@electiolab.com">contato@electiolab.com</a>.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
            <p style="color: #737373; font-size: 12px;">
              ElectioLab · <a href="https://electiolab.com" style="color: #2563eb;">electiolab.com</a>
            </p>
          </div>
        `,
      })
      .catch((e) => console.error("[regenerate] email send failed:", e));
  }

  return NextResponse.json({
    success: true,
    api_key: newKey,
    tier,
    rate_limit: existing.rate_limit,
    email_sent: Boolean(user.email && resend),
    message: "Guarde esta key em local seguro. Também enviamos por email.",
  });
}
