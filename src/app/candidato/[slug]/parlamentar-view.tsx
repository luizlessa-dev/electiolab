import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { CeapSummary, Parlamentar } from "@/lib/tf-data";
import type { Politico } from "@/lib/politicians";
import type { VotacoesParlamentar as VotacoesDados } from "@/lib/votacoes";
import { VotacoesParlamentar } from "@/components/votacoes-parlamentar";
import { CeapParlamentar } from "@/components/ceap-parlamentar";

// Só hosts liberados em next.config.ts (images.remotePatterns): um host fora da lista
// derruba a renderização da página inteira, então foto de origem desconhecida é omitida.
const FOTO_PERMITIDA = /^https:\/\/(www\.camara\.leg\.br|www25\.senado\.leg\.br|www\.senado\.leg\.br)\//;

export function cargoDoParlamentar(p: Pick<Parlamentar, "casa_legislativa">): string {
  return p.casa_legislativa === "senado" ? "Senador(a)" : "Deputado(a) federal";
}

/**
 * Página de uma pessoa que está no TF (parlamentar) mas não tem linha em
 * `candidates`: não concorre nos dados do ElectioLab, então não há pesquisas nem
 * campanha para mostrar. O que há é o que o TF sabe: votações e cota parlamentar.
 * Renderizada por /candidato/[slug] quando o slug é de `politicians` (flag ROTA_POLITICIANS).
 */
export function ParlamentarView({
  politico,
  parlamentar,
  votacoes,
  ceap,
}: {
  politico: Politico;
  parlamentar: Parlamentar;
  votacoes: VotacoesDados | null;
  ceap: CeapSummary | null;
}) {
  const nome = parlamentar.nome_parlamentar ?? politico.displayName;
  const partido = parlamentar.partido_atual ?? parlamentar.partido;
  const foto = parlamentar.foto_url && FOTO_PERMITIDA.test(parlamentar.foto_url) ? parlamentar.foto_url : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>ElectioLab</span>
          </Link>
          <Link href="/dashboard" className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium">
            Acessar Terminal
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <section className="flex gap-5">
          {foto && (
            <div className="shrink-0">
              <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-lg overflow-hidden border-2 border-border bg-muted">
                <Image
                  src={foto}
                  alt={`Foto oficial de ${nome}${partido ? ` (${partido})` : ""}`}
                  fill
                  sizes="(max-width: 768px) 112px, 144px"
                  className="object-cover"
                />
              </div>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{nome}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {cargoDoParlamentar(parlamentar)}
              {partido ? ` · ${partido}` : ""}
              {parlamentar.uf ? ` · ${parlamentar.uf}` : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-3 max-w-xl">
              Esta pessoa não aparece como candidata nos dados de pesquisa do ElectioLab. Mostramos o que a
              fonte oficial registra do mandato: votações no plenário e cota parlamentar.
            </p>
          </div>
        </section>

        {votacoes && <VotacoesParlamentar dados={votacoes} />}
        {ceap && <CeapParlamentar ceap={ceap} />}

        {!votacoes && !ceap && (
          <p className="text-sm text-muted-foreground rounded-md border border-border bg-muted/20 px-4 py-3">
            Ainda não há votações nem cota parlamentar publicadas para este mandato.
          </p>
        )}
      </main>
    </div>
  );
}
