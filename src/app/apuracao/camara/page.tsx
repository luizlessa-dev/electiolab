import type { Metadata } from "next";
import Link from "next/link";
import { carregarProjecaoCamara } from "@/lib/simulador/camara-projecao";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Projeção da Câmara — Eleições 2026",
  description:
    "Projeção Electiolab da bancada da Câmara dos Deputados, calculada em tempo real a partir da apuração do TSE.",
};

const fmtNum = (n: number) => n.toLocaleString("pt-BR");
const fmtPct = (vagas: number, total: number) => (total === 0 ? "—" : `${((vagas / total) * 100).toFixed(1)}%`);

function labelTipo(tipo: "i" | "c" | "f"): string {
  if (tipo === "f") return "Federação";
  if (tipo === "c") return "Coligação";
  return "Partido";
}

export default async function CamaraPage() {
  const projecao = await carregarProjecaoCamara();

  if (!projecao) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-muted-foreground">Sem dados de apuração de Deputado Federal ainda.</p>
      </main>
    );
  }

  const { ambiente, totalDisputas, totalVagas, vagasDistribuidas, bancadas, disputasOficiais } = projecao;
  const tudoOficial = disputasOficiais === totalDisputas;
  const nadaOficial = disputasOficiais === 0;
  const maiorBancada = bancadas[0]?.vagas ?? 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/apuracao" className="text-sm font-semibold">
            ElectioLab
          </Link>
          <span className="text-xs text-muted-foreground font-mono">
            Apuração 2026 · {ambiente}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <section>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            {tudoOficial ? "Câmara dos Deputados — bancadas eleitas" : "Câmara dos Deputados — projeção Electiolab"}
          </h1>
          <p className="text-xs text-muted-foreground font-mono mb-1">
            {tudoOficial
              ? "Resultado oficial do TSE: vagas distribuídas pelo TSE nas 27 unidades da Federação."
              : nadaOficial
                ? "Cálculo Electiolab em tempo real — QE, QP e sobras (arts. 106-109 do Código Eleitoral) aplicados aos votos já apurados, disputa a disputa. Não é o resultado oficial do TSE."
                : `Resultado misto: ${disputasOficiais} de ${totalDisputas} UFs já finalizadas pelo TSE (vagas oficiais); nas demais, cálculo Electiolab sobre os votos apurados até agora.`}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {totalDisputas} disputas estaduais · {fmtNum(vagasDistribuidas)} de {fmtNum(totalVagas)} vagas
            {tudoOficial ? " distribuídas" : " projetadas"}
            {vagasDistribuidas !== totalVagas && vagasDistribuidas > 0 && (
              <span className="text-warning"> (divergência: candidatos elegíveis insuficientes em alguma UF)</span>
            )}
          </p>
        </section>

        <section>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="hidden md:flex items-center px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
              <span className="w-10">#</span>
              <span className="flex-1">Partido / federação</span>
              <span className="w-24">Tipo</span>
              <span className="w-16 text-right">UFs</span>
              <span className="w-20 text-right">Vagas</span>
              <span className="w-20 text-right">% Câmara</span>
              <span className="w-32">&nbsp;</span>
            </div>
            {bancadas.map((b, i) => (
              <div
                key={b.nome}
                className="flex flex-col md:flex-row md:items-center px-4 py-3 text-sm border-b border-border/30 last:border-0"
              >
                <span className="md:w-10 font-mono tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="flex-1 font-semibold">{b.nome}</span>
                <span className="md:w-24 text-xs text-muted-foreground">{labelTipo(b.tipo)}</span>
                <span className="md:w-16 md:text-right font-mono tabular-nums text-xs text-muted-foreground">
                  {b.ufs.length}
                </span>
                <span className="md:w-20 md:text-right font-mono tabular-nums font-semibold">{b.vagas}</span>
                <span className="md:w-20 md:text-right font-mono tabular-nums text-xs text-muted-foreground">
                  {fmtPct(b.vagas, totalVagas)}
                </span>
                <span className="md:w-32 flex items-center">
                  <span
                    className="h-1.5 rounded-full bg-primary/70"
                    style={{ width: `${Math.max(4, (b.vagas / maiorBancada) * 100)}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          {tudoOficial
            ? "Fonte: TSE — dados oficiais sem alteração"
            : "Projeção Electiolab nas UFs ainda em apuração — não é dado oficial do TSE"}
        </div>
      </footer>
    </div>
  );
}
