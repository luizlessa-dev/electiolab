"use client";

// Wrapper para lazy-load do DriftChart. Recharts pesa ~80KB gzip e o
// gráfico fica abaixo da dobra na maioria dos viewports — não justifica
// estar no bundle inicial do /candidato/[slug].
//
// next/dynamic com ssr:false só funciona dentro de Client Components.
// Por isso esse arquivo separado: a página em si é Server Component.

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const DriftChartInner = dynamic(
  () => import("./drift-chart").then((m) => m.DriftChart),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-border bg-card p-8 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Carregando histórico…</span>
      </div>
    ),
  },
);

type Props = {
  candidateId: string;
  candidateName: string;
  color: string;
};

export function DriftChartLazy(props: Props) {
  return <DriftChartInner {...props} />;
}
