"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomQuota {
  id: string;
  api_key_id: string;
  user_id: string;
  override_limit: number;
  override_reason: string | null;
  changed_at: string;
}

interface ApiKey {
  id: string;
  user_id: string;
  tier: string;
  rate_limit: number;
}

export default function AdminCustomQuotasPage() {
  const [customQuotas, setCustomQuotas] = useState<CustomQuota[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchEmail, setSearchEmail] = useState("");
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newLimit, setNewLimit] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const sb = createClient();

      // Carregar custom quotas
      const response = await fetch("/api/admin/custom-quotas");
      if (response.ok) {
        const data = await response.json();
        setCustomQuotas(data.data || []);
      }

      // Carregar API keys para busca
      const { data: keys } = await sb.from("api_keys").select("*").limit(100);
      if (keys) {
        setApiKeys(keys as ApiKey[]);
      }

      setLoading(false);
    } catch (err) {
      console.error("Load error:", err);
      setMessage({ type: "error", text: "Erro ao carregar dados" });
      setLoading(false);
    }
  }

  async function handleSetQuota() {
    if (!selectedKey || !newLimit) {
      setMessage({ type: "error", text: "Selecione uma API key e informe o novo limite" });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/custom-quotas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key_id: selectedKey.id,
          new_limit: parseInt(newLimit, 10),
          reason: reason || "Admin override",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Quota atualizada: ${result.change.old_limit} → ${result.change.new_limit}`,
        });
        setNewLimit("");
        setReason("");
        setSelectedKey(null);
        loadData();
      } else {
        setMessage({ type: "error", text: result.error || "Erro ao atualizar quota" });
      }
    } catch (err) {
      setMessage({ type: "error", text: `Erro: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveQuota(quotaId: string) {
    if (!confirm("Remover custom quota? Voltará para limite padrão de tier.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/custom-quotas?id=${quotaId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Custom quota removida" });
        loadData();
      } else {
        const result = await response.json();
        setMessage({ type: "error", text: result.error || "Erro ao remover" });
      }
    } catch (err) {
      setMessage({ type: "error", text: `Erro: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin: Quotas Personalizadas</h1>
        <p className="text-muted-foreground mt-2">
          Override manual de limites de API keys
        </p>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Atualizar Quota</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div
              className={`p-3 rounded text-sm ${
                message.type === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Buscar API Key (user_id ou tier)</label>
            <input
              type="text"
              placeholder="Buscar por user_id ou tier"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded text-sm"
            />
          </div>

          {searchEmail && (
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {apiKeys
                .filter(
                  (k) =>
                    k.user_id.includes(searchEmail) ||
                    k.tier.includes(searchEmail.toLowerCase())
                )
                .map((key) => (
                  <div
                    key={key.id}
                    onClick={() => {
                      setSelectedKey(key);
                      setSearchEmail("");
                    }}
                    className="p-2 cursor-pointer hover:bg-muted rounded text-sm"
                  >
                    {key.user_id.slice(0, 8)}... ({key.tier}) — {key.rate_limit} req/mês
                  </div>
                ))}
            </div>
          )}

          {selectedKey && (
            <div className="p-3 bg-muted rounded">
              <p className="text-sm">
                <strong>Selecionado:</strong> {selectedKey.user_id.slice(0, 8)}...
                <br />
                <strong>Tier:</strong> {selectedKey.tier.toUpperCase()}
                <br />
                <strong>Limite padrão:</strong> {selectedKey.rate_limit.toLocaleString("pt-BR")}
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Novo Limite (req/mês)</label>
            <input
              type="number"
              min="0"
              max="999999"
              placeholder="Ex: 5000"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Motivo (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Cliente especial, contrato customizado"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded text-sm"
            />
          </div>

          <button
            onClick={handleSetQuota}
            disabled={submitting || !selectedKey || !newLimit}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
          >
            {submitting ? "Atualizando..." : "Atualizar Quota"}
          </button>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Quotas Ativas ({customQuotas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">User ID</th>
                  <th className="text-right py-2 px-2">Limite</th>
                  <th className="text-left py-2 px-2">Motivo</th>
                  <th className="text-left py-2 px-2">Modificado</th>
                  <th className="text-center py-2 px-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {customQuotas.length > 0 ? (
                  customQuotas.map((quota) => (
                    <tr key={quota.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-mono text-xs">
                        {quota.user_id.slice(0, 8)}...
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {quota.override_limit.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">
                        {quota.override_reason || "—"}
                      </td>
                      <td className="py-2 px-2 text-xs">
                        {new Date(quota.changed_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => handleRemoveQuota(quota.id)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 px-2 text-center text-muted-foreground">
                      Nenhuma custom quota ativa
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
