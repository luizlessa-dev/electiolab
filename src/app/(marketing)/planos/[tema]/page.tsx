import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, User } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { PlanosGovernoAviso } from "@/components/planos-governo-aviso";

export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

async function getTema(slug: string) {
  const { data } = await sb().from("tema").select("id, slug, nome").eq("slug", slug).maybeSingle();
  return data;
}

type Trecho = { id: string; pagina: number; texto: string };
type CandidatoBloco = {
  id: string;
  nome: string;
  photo_url: string | null;
  pdf_url_publico: string | null;
  trechos: Trecho[];
};

async function getBlocos(temaId: string): Promise<CandidatoBloco[]> {
  const supabase = sb();

  // Todo presidenciável com plano registrado entra na página, mesmo sem
  // trecho aprovado nesse tema — "não trata do tema" é dado, não omissão.
  const { data: elections } = await supabase.from("elections").select("id, name").eq("year", 2026).eq("type", "presidente");
  const primeiroTurno = (elections ?? []).find((e) => !String(e.name).includes("2º Turno"));

  const { data: candidatos } = await supabase
    .from("candidates")
    .select("id, name, photo_url")
    .eq("election_id", primeiroTurno?.id ?? "");

  const { data: planos } = await supabase
    .from("plano_governo")
    .select("id, candidato_id, pdf_url_publico")
    .in("candidato_id", (candidatos ?? []).map((c) => c.id));

  const { data: trechos } = await supabase
    .from("plano_trecho")
    .select("id, plano_id, pagina, texto")
    .eq("tema_id", temaId)
    .eq("status", "aprovado")
    .order("pagina", { ascending: true });

  const planoByCandidatoId = new Map((planos ?? []).map((p) => [p.candidato_id, p]));
  const trechosByPlanoId = new Map<string, Trecho[]>();
  for (const t of trechos ?? []) {
    const arr = trechosByPlanoId.get(t.plano_id) ?? [];
    arr.push({ id: t.id, pagina: t.pagina, texto: t.texto });
    trechosByPlanoId.set(t.plano_id, arr);
  }

  const blocos: CandidatoBloco[] = (candidatos ?? [])
    .filter((c) => planoByCandidatoId.has(c.id))
    .map((c) => {
      const plano = planoByCandidatoId.get(c.id)!;
      return {
        id: c.id,
        nome: c.name,
        photo_url: c.photo_url,
        pdf_url_publico: plano.pdf_url_publico,
        trechos: trechosByPlanoId.get(plano.id) ?? [],
      };
    })
    // Alfabético — regra editorial: nunca por pesquisa, partido ou relevância.
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return blocos;
}

export async function generateMetadata({ params }: { params: Promise<{ tema: string }> }): Promise<Metadata> {
  const { tema: slug } = await params;
  const tema = await getTema(slug);
  if (!tema) return {};
  const title = `${tema.nome}: o que cada presidenciável propõe (plano de governo 2026)`;
  const description = `Trecho literal do plano de governo de cada presidenciável 2026 sobre ${tema.nome.toLowerCase()}, direto do documento registrado no TSE.`;
  return {
    title,
    description,
    alternates: { canonical: `https://electiolab.com/planos/${slug}` },
    openGraph: { title, description, url: `https://electiolab.com/planos/${slug}` },
  };
}

export default async function PlanoTemaPage({ params }: { params: Promise<{ tema: string }> }) {
  const { tema: slug } = await params;
  const tema = await getTema(slug);
  if (!tema) notFound();

  const blocos = await getBlocos(tema.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: `${tema.nome}: o que cada presidenciável propõe`,
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        dateModified: new Date().toISOString().slice(0, 10),
        inLanguage: "pt-BR",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
          { "@type": "ListItem", position: 2, name: "Planos de governo", item: "https://electiolab.com/planos" },
          { "@type": "ListItem", position: 3, name: tema.nome },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="sticky top-0 z-30 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/planos" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>Planos de governo</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <article>
          <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">{tema.nome}</h1>

          <div className="mb-8">
            <PlanosGovernoAviso />
          </div>

          <div className="space-y-6">
            {blocos.map((b) => (
              <section key={b.id} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                    {b.photo_url ? (
                      <Image src={b.photo_url} alt={b.nome} fill sizes="40px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold">{b.nome}</h2>
                </div>

                {b.trechos.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">O plano não trata deste tema.</p>
                ) : (
                  <div className="space-y-4">
                    {b.trechos.map((t) => (
                      <blockquote key={t.id} className="border-l-2 border-primary/30 pl-4">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{t.texto}</p>
                        <footer className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>página {t.pagina}</span>
                          {b.pdf_url_publico && (
                            <>
                              <span>·</span>
                              <a
                                href={b.pdf_url_publico}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 hover:underline"
                              >
                                <FileText className="h-3 w-3" /> ver PDF original
                              </a>
                            </>
                          )}
                        </footer>
                      </blockquote>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </article>
      </main>

      <footer className="mt-12 border-t border-border py-6">
        <div className="mx-auto max-w-3xl px-4 text-center font-mono text-xs text-muted-foreground">
          ElectioLab · Planos de governo via TSE (DivulgaCandContas)
        </div>
      </footer>
    </div>
  );
}
