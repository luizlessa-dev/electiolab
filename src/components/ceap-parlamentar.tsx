import Link from "next/link";
import { Receipt } from "lucide-react";
import type { CeapSummary } from "@/lib/tf-data";

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v);
}

function fmtBig(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)} mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmtBRL(v);
}

/**
 * Bloco "Cota Parlamentar (CEAP)" (Câmara, últimos 24 meses), compartilhado pela
 * ficha do candidato e pela página da pessoa. Extraído de candidate-view.tsx sem
 * mudança de conteúdo.
 */
export function CeapParlamentar({ ceap }: { ceap: CeapSummary }) {
  return (
  <section>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-primary" />
        <h2 className="text-xl font-bold">Cota Parlamentar (CEAP)</h2>
      </div>
      <span className="text-xs text-muted-foreground">
        Câmara dos Deputados · últimos 24 meses
      </span>
    </div>
    <div className="grid md:grid-cols-2 gap-3">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Total declarado</p>
        <p className="text-2xl font-mono font-bold tabular-nums">{fmtBig(ceap.total)}</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Últimos 12 meses: <strong>{fmtBig(ceap.totalRecente)}</strong>
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Top categoria</p>
        {ceap.byType[0] && (
          <>
            <p className="text-sm font-semibold truncate">{ceap.byType[0].tipo}</p>
            <p className="text-lg font-mono font-bold tabular-nums">{fmtBig(ceap.byType[0].total)}</p>
            <p className="text-[11px] text-muted-foreground">{ceap.byType[0].count} despesas</p>
          </>
        )}
      </div>
    </div>

    {ceap.byType.length > 1 && (
      <div className="rounded-lg border border-border bg-card overflow-hidden mt-3">
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Distribuição por categoria
          </p>
        </div>
        <div className="divide-y divide-border/30 text-sm">
          {ceap.byType.slice(0, 8).map((t) => (
            <div key={t.tipo} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate uppercase tracking-wide">{t.tipo}</p>
                <p className="text-[10px] text-muted-foreground">{t.count} despesas</p>
              </div>
              <span className="font-mono font-bold tabular-nums shrink-0">{fmtBig(t.total)}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {ceap.topFornecedores.length > 0 && (
      <div className="rounded-lg border border-border bg-card overflow-hidden mt-3">
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Top 5 fornecedores
          </p>
        </div>
        <div className="divide-y divide-border/30 text-sm">
          {ceap.topFornecedores.slice(0, 5).map((f, i) => (
            <div key={`${f.fornecedor}-${i}`} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs truncate">{f.fornecedor}</p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {f.cnpj ? `CNPJ ${f.cnpj}` : "—"} · {f.count} pagamentos
                </p>
              </div>
              <span className="font-mono font-bold tabular-nums shrink-0">{fmtBig(f.total)}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    <p className="text-xs text-muted-foreground mt-3">
      Fonte: Câmara dos Deputados — Cota Parlamentar via Transparência Federal.{" "}
      <Link href="/cota-parlamentar" className="text-primary hover:underline">
        Ver ranking completo →
      </Link>
    </p>
  </section>
  );
}
