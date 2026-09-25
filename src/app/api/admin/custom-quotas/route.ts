/**
 * Gerenciar quotas customizadas (override de limites padrão)
 *
 * POST /api/admin/custom-quotas
 *   Body: { api_key_id, new_limit, reason }
 *   Requer: user autenticado + admin
 *
 * GET /api/admin/custom-quotas
 *   Requer: user autenticado + admin
 *
 * DELETE /api/admin/custom-quotas/:id
 *   Requer: user autenticado + admin
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "ElectioLab <noreply@electiolab.com>";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Autenticar
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verificar se é admin (app_metadata: só service_role pode alterar, ao contrário de user_metadata)
    const { data: userData } = await supabase.auth.admin.getUserById(user.id);
    const isAdmin = userData?.user?.app_metadata?.is_admin === true;

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
    }

    const body = await request.json();
    const { api_key_id, new_limit, reason } = body;

    if (!api_key_id || new_limit === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: api_key_id, new_limit" },
        { status: 400 }
      );
    }

    if (new_limit < 0 || new_limit > 999999) {
      return NextResponse.json(
        { error: "Limite deve estar entre 0 e 999999" },
        { status: 400 }
      );
    }

    // Buscar API key para pegar user_id e tier
    const { data: apiKey, error: fetchError } = await supabase
      .from("api_keys")
      .select("id, user_id, tier, rate_limit")
      .eq("id", api_key_id)
      .single();

    if (fetchError || !apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Chamar função Supabase para upsert custom quota (EXECUTE revogado de anon/authenticated)
    const { data: result, error: rpcError } = await supabaseAdmin.rpc(
      "set_custom_quota" as any,
      {
        p_api_key_id: api_key_id,
        p_user_id: apiKey.user_id,
        p_new_limit: new_limit,
        p_reason: reason || "Admin override",
        p_changed_by: user.id,
      }
    );

    if (rpcError) {
      console.error("[custom-quotas] RPC error:", rpcError);
      return NextResponse.json(
        { error: `RPC failed: ${rpcError.message}` },
        { status: 500 }
      );
    }

    const changeInfo = (Array.isArray(result) ? result[0] : result) as {
      success: boolean;
      old_limit: number | null;
      new_limit: number;
      message: string;
    } | null;

    if (!changeInfo?.success) {
      const msg = changeInfo?.message || "Unknown error";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Email ao customer notificando mudança
    const tierLabel = (apiKey.tier || "pro").toUpperCase();
    const oldLabel = changeInfo.old_limit
      ? `${changeInfo.old_limit.toLocaleString("pt-BR")} (${tierLabel})`
      : "Padrão";

    const { data: customerUser } = await supabase.auth.admin.getUserById(
      apiKey.user_id
    );
    const customerEmail = customerUser?.user?.email;

    if (customerEmail && resend) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: "ElectioLab: Sua quota de API foi atualizada",
        html: `
          <div style="font-family: ui-sans-serif, system-ui; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #2563eb;">Quota de API Atualizada</h2>

            <p style="font-size: 16px; margin: 16px 0;">
              Olá,<br>
              Sua quota de API foi modificada manualmente.
            </p>

            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 8px 0;">
                <strong>Antiga quota:</strong> ${oldLabel}
              </p>
              <p style="margin: 8px 0;">
                <strong>Nova quota:</strong> ${new_limit.toLocaleString(
                  "pt-BR"
                )} requisições/mês
              </p>
              <p style="margin: 8px 0; font-size: 14px; color: #666;">
                ${reason || ""}
              </p>
            </div>

            <p style="color: #737373; font-size: 14px;">
              Sua nova cota entrará em vigor imediatamente.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
            <p style="color: #737373; font-size: 12px; margin: 0;">
              ElectioLab — Inteligência Eleitoral<br>
              <a href="https://electiolab.com/dashboard/api" style="color: #2563eb;">Dashboard</a>
            </p>
          </div>
        `,
      }).catch((e) =>
        console.error("[custom-quotas] email send failed:", e)
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Quota customizada de ${changeInfo.old_limit} para ${changeInfo.new_limit}`,
        change: changeInfo,
      },
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[custom-quotas] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Autenticar
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verificar admin
    const { data: userData } = await supabase.auth.admin.getUserById(user.id);
    const isAdmin = userData?.user?.app_metadata?.is_admin === true;

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
    }

    // Listar custom quotas (últimas 50)
    const { data: quotas, error } = await supabase
      .from("custom_quotas" as any)
      .select("id, api_key_id, user_id, override_limit, override_reason, changed_at")
      .order("changed_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: quotas || [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[custom-quotas] GET error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    // Autenticar
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verificar admin
    const { data: userData } = await supabase.auth.admin.getUserById(user.id);
    const isAdmin = userData?.user?.app_metadata?.is_admin === true;

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const quotaId = searchParams.get("id");

    if (!quotaId) {
      return NextResponse.json({ error: "Missing quota id" }, { status: 400 });
    }

    // Remover custom quota (volta para tier padrão)
    const { error } = await supabase
      .from("custom_quotas" as any)
      .delete()
      .eq("id", quotaId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Custom quota removida",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[custom-quotas] DELETE error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
