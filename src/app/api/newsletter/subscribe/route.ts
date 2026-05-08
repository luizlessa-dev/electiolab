import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://electiolab.com";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "ElectioLab <noreply@electiolab.com>";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function generateToken(): string {
  // 32-char hex (base16 of 16 random bytes)
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: Request) {
  try {
    const { email, source = "site" } = (await req.json()) as { email: string; source?: string };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const token = generateToken();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Primeiro: salva como pending (token de confirmação)
    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("id, confirmed_at, is_active")
      .eq("email", cleanEmail)
      .maybeSingle();

    // Se já confirmado, retorna sucesso silencioso
    if (existing?.confirmed_at) {
      return NextResponse.json({
        success: true,
        already_subscribed: true,
        provider: BEEHIIV_API_KEY ? "beehiiv" : "supabase-only",
      });
    }

    // Insert/update com novo token (sobrescreve token anterior se reenvio)
    await supabase.from("newsletter_subscribers").upsert(
      {
        email: cleanEmail,
        source,
        confirmation_token: token,
        confirmation_sent_at: new Date().toISOString(),
        subscribed_at: new Date().toISOString(),
        is_active: false, // só vira true após confirmar
      },
      { onConflict: "email" }
    );

    const confirmUrl = `${SITE_URL}/api/newsletter/confirm?token=${encodeURIComponent(token)}`;

    // Envia email de confirmação via Resend
    let emailSent = false;
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: cleanEmail,
          subject: "ElectioLab — Confirme sua inscrição na newsletter",
          html: `
            <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
              <h2 style="color: #2563eb; margin: 0 0 12px 0;">Confirme sua inscrição</h2>
              <p style="font-size: 15px; line-height: 1.6;">
                Você está a um clique de receber a <strong>Sinal Eleitoral</strong>, a newsletter
                semanal do ElectioLab com média ponderada de pesquisas, ranking de institutos por
                acurácia e movimentações que importam.
              </p>
              <p style="margin: 24px 0;">
                <a href="${confirmUrl}"
                   style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  Confirmar inscrição
                </a>
              </p>
              <p style="font-size: 13px; color: #525252; line-height: 1.5;">
                Se o botão não funcionar, copie esta URL no navegador:<br/>
                <code style="background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-size: 12px; word-break: break-all;">${confirmUrl}</code>
              </p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
              <p style="font-size: 12px; color: #737373; line-height: 1.5;">
                Você recebeu este email porque alguém (provavelmente você) inscreveu este endereço
                em <a href="${SITE_URL}" style="color: #2563eb;">electiolab.com</a>. Se não foi
                você, ignore — não enviaremos mais nada.
              </p>
              <p style="font-size: 11px; color: #9ca3af;">
                ElectioLab · Inteligência Eleitoral · Compatível com LGPD (Lei 13.709/2018).
              </p>
            </div>
          `,
        });
        emailSent = true;
      } catch (e) {
        console.error("[newsletter/subscribe] email send failed:", e);
      }
    }

    return NextResponse.json({
      success: true,
      requires_confirmation: true,
      email_sent: emailSent,
      message: "Inscrição recebida. Confira seu email pra confirmar.",
    });
  } catch (err) {
    console.error("[newsletter/subscribe] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}
