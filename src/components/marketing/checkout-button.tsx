"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  tier: "pro" | "business";
  interval?: "monthly" | "yearly";
  className?: string;
  children: React.ReactNode;
}

export function CheckoutButton({ tier, interval = "monthly", className, children }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      // Verificar se está logado
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/auth/login?next=/precos`);
        return;
      }

      // Criar sessão Checkout
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Erro ao iniciar checkout. Tente novamente.");
      }
    } catch {
      alert("Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? "Redirecionando..." : children}
    </button>
  );
}
