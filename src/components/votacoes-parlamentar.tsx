import { Vote } from "lucide-react";
import {
  VOTO_LABEL,
  VOTO_TOM,
  formatPct,
  type VotacoesParlamentar,
  type VotoTom,
} from "@/lib/votacoes";

const TOM_CLASSE: Record<VotoTom, string> = {
  positive: "bg-positive/15 text-positive",
  negative: "bg-negative/15 text-negative",
  neutral: "bg-muted/30 text-muted-foreground",
};

const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
const fmtInt = (n: number) => n.toLocaleString("pt-BR");

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">{titulo}</p>
      {children}
    </div>
  );
}

/**
 * Bloco "Votações" da ficha: presença, votos e últimas votações nominais.
 * Server component, sem estado. Dados e regras: src/lib/votacoes.ts.
 */
export function VotacoesParlamentar({ dados }: { dados: VotacoesParlamentar }) {
  const { resumo: r, recentes } = dados;
  const camara = r.casa === "camara";
  const fonte = camara
    ? `Câmara dos Deputados${r.legislatura ? ` · ${r.legislatura}ª legislatura` : ""}`
    : `Senado Federal${r.primeiraSessao ? ` · desde ${new Date(r.primeiraSessao).getUTCFullYear()}` : ""}`;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Vote className="h-4 w-4 text-primary" />
          <h2 className="text-xl font-bold">Votações no plenário</h2>
        </div>
        <span className="text-xs text-muted-foreground">{fonte}</span>
      </div>

      <div className={`grid gap-3 ${!camara && r.pctAlinhamento !== null ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        <Card titulo="Presença">
          <p className="text-2xl font-mono font-bold tabular-nums">{formatPct(r.pctPresenca)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {r.pctPresenca !== null ? (
              <>
                em <strong>{fmtInt(r.votacoesNominais)}</strong> votações nominais
                {r.pctPresenca12m !== null && <> · últimos 12 meses: <strong>{formatPct(r.pctPresenca12m)}</strong></>}
              </>
            ) : (
              <>
                votou em <strong>{fmtInt(r.votacoesNominais)}</strong> votações nominais
              </>
            )}
          </p>
        </Card>

        <Card titulo="Como votou">
          <p className="text-sm font-mono tabular-nums">
            <span className="text-positive font-bold">{fmtInt(r.votosSim)}</span> Sim ·{" "}
            <span className="text-negative font-bold">{fmtInt(r.votosNao)}</span> Não ·{" "}
            <strong>{fmtInt(r.votosAbstencao)}</strong> Abst.
            {camara && r.votosObstrucao > 0 && (
              <>
                {" "}
                · <strong>{fmtInt(r.votosObstrucao)}</strong> Obstr.
              </>
            )}
          </p>
          {!camara && r.votacoesSecretas ? (
            <p className="text-[11px] text-muted-foreground mt-1">
              {fmtInt(r.votacoesSecretas)} votações secretas: o voto individual não é público.
            </p>
          ) : null}
        </Card>

        {camara ? (
          <Card titulo="Alinhamento com o partido">
            <p className="text-2xl font-mono font-bold tabular-nums">{formatPct(r.concordanciaPartido)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">votos iguais à orientação da bancada</p>
          </Card>
        ) : (
          <Card titulo="Faltas sem justificativa">
            <p className="text-2xl font-mono font-bold tabular-nums">{formatPct(r.pctFaltasNaoJustificadas)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              + <strong>{fmtInt(r.ausenciasJustificadas ?? 0)}</strong> ausências justificadas (licença, missão,
              atividade parlamentar)
            </p>
          </Card>
        )}

        {!camara && r.pctAlinhamento !== null && (
          <Card titulo="Alinhamento com o partido">
            <p className="text-2xl font-mono font-bold tabular-nums">{formatPct(r.pctAlinhamento)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              em <strong>{fmtInt(r.votacoesComOrientacao ?? 0)}</strong> votações em que o partido orientou Sim ou Não
            </p>
          </Card>
        )}
      </div>

      {r.presencaNaoCalculada && (
        <p className="text-xs text-muted-foreground mt-3 rounded-md border border-border bg-muted/20 px-3 py-2">
          {r.presencaNaoCalculada}
        </p>
      )}

      {recentes.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden mt-3">
          <div className="px-4 py-2 border-b border-border bg-muted/30">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Últimas votações nominais
            </p>
          </div>
          <div className="divide-y divide-border/30 text-sm">
            {recentes.map((v) => (
              <div key={v.votacaoId} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">{fmtData(v.data)}</span>
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-2">{v.descricao ?? v.materia ?? "Votação nominal"}</p>
                  {(v.materia || v.resultado) && (
                    <p className="text-[10px] text-muted-foreground">
                      {[v.materia, v.resultado].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded shrink-0 ${TOM_CLASSE[VOTO_TOM[v.voto]]}`}>
                  {VOTO_LABEL[v.voto]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-3">
        Fonte: {camara ? "Câmara dos Deputados" : "Senado Federal"} (dados abertos) via Transparência Federal.
        Só votações nominais entram no cálculo.
        {camara
          ? " Presença = votações em que votou ÷ votações nominais no período de exercício."
          : " Presença = votações com voto ou presença registrada ÷ todas as votações nominais; ausência justificada reduz a presença, mas não é falta."}
        {!camara && r.pctAlinhamento !== null &&
          " Alinhamento: só votações em que a liderança do partido registrou orientação Sim ou Não (cobertura parcial); abstenção conta como não alinhada."}
      </p>
    </section>
  );
}
