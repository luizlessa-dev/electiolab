import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCandidateBySlug } from "@/lib/queries";
import { getParlamentarByCpf, getCeapByCamaraId, crossCeapWithCeis } from "@/lib/tf-data";
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Calendar,
  TrendingUp,
  Megaphone,
  Banknote,
  ExternalLink,
  Vote,
  Scale,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Home,
  Globe,
  Wallet,
  Receipt,
  History,
  Trophy,
  XCircle as XCircleIcon,
} from "lucide-react";
import { DriftChartLazy as DriftChart } from "./drift-chart-lazy";

export const revalidate = 3600; // 1h ISR — gera sob demanda na primeira request

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCandidateBySlug(slug);
  if (!c) return { title: "Candidato não encontrado" };

  const title = `${c.name}${c.party ? ` (${c.party})` : ""} — Pesquisas Eleitorais 2026`;
  const description = `Pesquisas e intenção de voto de ${c.name}${
    c.party ? ` (${c.party})` : ""
  } nas eleições 2026: média ponderada ElectioLab, trajetória, patrimônio e financiamento de campanha.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description, card: "summary_large_image" },
    alternates: { canonical: `https://electiolab.com/candidato/${slug}` },
  };
}

export default async function CandidatoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await getCandidateBySlug(slug);
  if (!c) notFound();

  const election = (c as any).election;
  const polls = ((c as any).poll_results ?? []) as Array<{
    percentage: number;
    poll: { id: string; publication_date: string; sample_size: number; methodology: string; institute: { name: string; slug: string | null } | null };
  }>;
  const sortedPolls = [...polls].sort((a, b) =>
    (b.poll?.publication_date ?? "").localeCompare(a.poll?.publication_date ?? "")
  );
  const latestPoll = sortedPolls[0];
  const electionResults = (c as any).election_results ?? [];
  const finance = (c as any).campaign_finances?.[0];
  const digitalAds = ((c as any).digital_ads ?? []) as Array<{
    id: string; platform: string | null; page_name: string;
    spend_lower: number | null; spend_upper: number | null;
    impressions_lower: number | null; impressions_upper: number | null;
    creative_text: string | null;
  }>;
  // Agrupa por plataforma
  const adsByPlatform: Record<string, typeof digitalAds> = {};
  for (const ad of digitalAds) {
    const p = ad.platform ?? "outras";
    (adsByPlatform[p] ||= []).push(ad);
  }
  const votes = ((c as any).legislative_votes ?? []) as Array<{
    id: string; vote_date: string; bill_title: string; vote: string; topic: string; importance: number;
  }>;
  // Votos agrupados por tópico
  const votesByTopic = votes.reduce<Record<string, typeof votes>>((acc, v) => {
    const t = v.topic || "geral";
    (acc[t] ||= []).push(v);
    return acc;
  }, {});
  const sortedTopics = Object.entries(votesByTopic).sort(
    ([, a], [, b]) =>
      Math.max(...b.map((v) => v.importance ?? 0)) - Math.max(...a.map((v) => v.importance ?? 0))
  );
  const proceedings = ((c as any).judicial_proceedings ?? []) as Array<{
    id: string; process_number: string | null; court: string; process_class: string; process_subject: string | null;
    current_status: string | null; is_relevant: boolean; source_url: string | null;
  }>;
  const relevantProceedings = proceedings.filter((p) => p.is_relevant);

  // TSE Extended datasets
  const assets = ((c as any).candidate_assets ?? []) as Array<{
    id: string; election_year: number; asset_type_name: string | null; description: string | null; value_brl: number | null;
  }>;
  const latestAssetsYear = assets.length ? Math.max(...assets.map((a) => a.election_year)) : null;
  const latestAssets = assets.filter((a) => a.election_year === latestAssetsYear);
  const totalNetWorth = latestAssets.reduce((s, a) => s + Number(a.value_brl ?? 0), 0);

  const socialMedia = ((c as any).candidate_social_media ?? []) as Array<{
    id: string; election_year: number; platform: string; url: string; handle: string | null;
  }>;
  const latestSocialYear = socialMedia.length ? Math.max(...socialMedia.map((s) => s.election_year)) : null;
  const latestSocial = socialMedia.filter((s) => s.election_year === latestSocialYear);

  const fefc = ((c as any).candidate_fefc ?? []) as Array<{
    id: string; election_year: number; amount_received: number; amount_spent: number; party_acronym: string | null;
  }>;
  const latestFefc = fefc.sort((a, b) => b.election_year - a.election_year)[0];

  // CEAP via Transparência Federal (cross-project)
  const candidateCpf = (c as any).cpf as string | null;
  const parlamentar = candidateCpf ? await getParlamentarByCpf(candidateCpf) : null;
  const ceap = parlamentar?.id_camara ? await getCeapByCamaraId(parlamentar.id_camara) : null;

  // Cruzamento CEAP × CEIS — alerta se algum fornecedor está sancionado
  const ceisMatches = ceap?.topFornecedores
    ? await crossCeapWithCeis(
        ceap.topFornecedores,
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
    : [];

  // Histórico eleitoral (2018, 2022, 2024)
  const priorResults = ((c as any).prior_election_results ?? []) as Array<{
    id: string; year: number; round: number; election_type: string;
    state: string | null; city: string | null; party: string | null;
    total_votes: number; result_status: string;
  }>;
  const sortedPriorResults = [...priorResults]
    .sort((a, b) => (b.year - a.year) || ((b.total_votes ?? 0) - (a.total_votes ?? 0)));

  // TSE situação (Ficha Limpa)
  const tseSit = (c as any).tse_last_situation as string | null;
  const tseSitYear = (c as any).tse_last_situation_year as number | null;

  // Aggregations totais (soma cross-platform)
  const adsTotal = digitalAds.length;
  const spendMin = digitalAds.reduce((s, a) => s + (Number(a.spend_lower) || 0), 0);
  const spendMax = digitalAds.reduce((s, a) => s + (Number(a.spend_upper) || 0), 0);

  // Por plataforma (pra exibir breakdown)
  const platformStats = Object.entries(adsByPlatform).map(([p, ads]) => ({
    platform: p,
    count: ads.length,
    spendMin: ads.reduce((s, a) => s + (Number(a.spend_lower) || 0), 0),
    spendMax: ads.reduce((s, a) => s + (Number(a.spend_upper) || 0), 0),
  }));
  const PLATFORM_LABELS: Record<string, string> = {
    meta: "Meta (Facebook + Instagram)",
    google: "Google (Search + YouTube + Display)",
    youtube: "YouTube",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
    twitter: "X / Twitter",
  };

  function fmt(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v);
  }
  function fmtBig(v: number) {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)} mi`;
    if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
    return fmt(v);
  }
  function age(birthDate: string | null) {
    if (!birthDate) return null;
    const b = new Date(birthDate);
    const now = new Date();
    let a = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
    return a;
  }

  const candidateAge = age((c as any).birth_date);

  // JSON-LD: Person + BreadcrumbList (boost de rich result na SERP)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `https://electiolab.com/candidato/${slug}#person`,
        name: c.name,
        description: (c as any).bio,
        birthDate: (c as any).birth_date,
        jobTitle: (c as any).current_position,
        affiliation: { "@type": "Organization", name: c.party },
        nationality: { "@type": "Country", name: "Brasil" },
        url: `https://electiolab.com/candidato/${slug}`,
        image: (c as any).photo_url ?? undefined,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "ElectioLab",
            item: "https://electiolab.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Candidatos",
            item: "https://electiolab.com/candidatos",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: c.name,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header navegação */}
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
        {/* HERO — perfil */}
        <section className="grid md:grid-cols-[1fr_280px] gap-8">
          <div className="flex gap-5">
            {(c as any).photo_url && (
              <div className="shrink-0">
                <div
                  className="relative w-28 h-28 md:w-36 md:h-36 rounded-lg overflow-hidden border-2 bg-muted"
                  style={{ borderColor: c.color ?? "var(--border)" }}
                >
                  <Image
                    src={(c as any).photo_url}
                    alt={`Foto oficial de ${c.name}${c.party ? ` (${c.party})` : ""}`}
                    fill
                    sizes="(max-width: 768px) 112px, 144px"
                    className="object-cover"
                    priority
                    unoptimized
                  />
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
              <span>Candidato</span>
              {election && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span>{election.name}</span>
                </>
              )}
            </div>
            <h1 className="mb-1">{c.name}</h1>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
              Pesquisas Eleitorais 2026
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
              {c.party && (
                <span className="px-2 py-0.5 rounded-md text-xs font-mono uppercase border" style={{ borderColor: c.color, color: c.color }}>
                  {c.party}
                </span>
              )}
              {candidateAge && <span>{candidateAge} anos</span>}
              {(c as any).current_position && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" /> {(c as any).current_position}
                </span>
              )}
              {tseSit === "APTO" && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-positive/15 text-positive border border-positive/30"
                  title={`Última candidatura registrada (${tseSitYear ?? "—"}): apta no TSE`}
                >
                  <CheckCircle2 className="h-3 w-3" /> Apto no TSE
                </span>
              )}
              {tseSit === "INAPTO" && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-warning/15 text-warning border border-warning/30"
                  title={`Última candidatura registrada (${tseSitYear ?? "—"}): indeferida pelo TSE — checar Ficha Limpa`}
                >
                  <AlertTriangle className="h-3 w-3" /> Indeferido em {tseSitYear}
                </span>
              )}
            </div>
            {(c as any).bio && (
              <p className="text-base text-muted-foreground leading-relaxed max-w-prose">
                {(c as any).bio}
              </p>
            )}
            </div>
          </div>

          {/* Card lateral — métricas */}
          <aside className="space-y-3">
            {latestPoll && (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Pesquisa mais recente</p>
                <p className="text-3xl font-mono font-bold tabular-nums" style={{ color: c.color ?? undefined }}>
                  {Number(latestPoll.percentage).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {latestPoll.poll?.institute?.slug ? (
                    <Link href={`/instituto/${latestPoll.poll.institute.slug}`} className="hover:text-primary hover:underline transition-colors">
                      {latestPoll.poll.institute.name}
                    </Link>
                  ) : (
                    latestPoll.poll?.institute?.name
                  )}
                  {" · "}{new Date(latestPoll.poll?.publication_date).toLocaleDateString("pt-BR")}
                </p>
              </div>
            )}
            {(c as any).net_worth && (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Patrimônio declarado</p>
                <p className="text-2xl font-mono font-bold tabular-nums">{fmtBig(Number((c as any).net_worth))}</p>
                <p className="text-xs text-muted-foreground mt-1">Fonte: TSE</p>
              </div>
            )}
          </aside>
        </section>

        {/* Dados pessoais */}
        <section className="grid md:grid-cols-3 gap-3">
          {(c as any).education && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                <GraduationCap className="h-3.5 w-3.5" /> Escolaridade
              </div>
              <p className="text-sm">{(c as any).education}</p>
            </div>
          )}
          {(c as any).profession && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                <Briefcase className="h-3.5 w-3.5" /> Profissão
              </div>
              <p className="text-sm">{(c as any).profession}</p>
            </div>
          )}
          {(c as any).current_term_start && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                <Calendar className="h-3.5 w-3.5" /> Mandato atual
              </div>
              <p className="text-sm">
                {new Date((c as any).current_term_start).getFullYear()}
                {(c as any).current_term_end && ` – ${new Date((c as any).current_term_end).getFullYear()}`}
              </p>
            </div>
          )}
        </section>

        {/* Pesquisas */}
        {sortedPolls.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-xl font-bold">Histórico em pesquisas — {election?.name}</h2>
            </div>
            {sortedPolls.length >= 2 && (
              <div className="mb-3">
                <DriftChart
                  candidateId={c.id as string}
                  candidateName={c.name as string}
                  color={(c.color as string | null) ?? "#3b82f6"}
                />
              </div>
            )}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                <span className="w-24">Data</span>
                <span className="flex-1">Instituto</span>
                <span className="w-24 text-right">Amostra</span>
                <span className="w-24 text-right">% voto</span>
              </div>
              {sortedPolls.slice(0, 10).map((pr, i) => (
                <div key={pr.poll?.id ?? i} className={`flex items-center px-3 py-2 text-sm border-b border-border/30 ${i % 2 ? "bg-muted/15" : ""}`}>
                  <span className="w-24 font-mono tabular-nums text-xs text-muted-foreground">
                    {pr.poll?.publication_date ? new Date(pr.poll.publication_date).toLocaleDateString("pt-BR") : "—"}
                  </span>
                  <span className="flex-1">
                    {pr.poll?.institute?.slug ? (
                      <Link href={`/instituto/${pr.poll.institute.slug}`} className="hover:text-primary hover:underline transition-colors">
                        {pr.poll.institute.name}
                      </Link>
                    ) : (
                      pr.poll?.institute?.name ?? "—"
                    )}
                  </span>
                  <span className="w-24 text-right font-mono tabular-nums text-xs text-muted-foreground">
                    {pr.poll?.sample_size?.toLocaleString("pt-BR") ?? "—"}
                  </span>
                  <span className="w-24 text-right font-mono tabular-nums font-bold" style={{ color: c.color ?? undefined }}>
                    {Number(pr.percentage).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
              Cada linha é uma pesquisa individual com sua{" "}
              <Link href="/margem-de-erro-pesquisa-eleitoral" className="text-primary hover:underline">
                margem de erro
              </Link>
              . Diferenças pequenas entre pesquisas geralmente são variação amostral, não tendência.{" "}
              <Link href="/glossario-pesquisa-eleitoral" className="text-primary hover:underline">
                Glossário →
              </Link>
            </p>
          </section>
        )}

        {/* Resultados oficiais */}
        {electionResults.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Vote className="h-4 w-4 text-primary" />
              <h2 className="text-xl font-bold">Resultados eleitorais</h2>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              {electionResults.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{r.result_description ?? "Resultado"}</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {r.total_votes?.toLocaleString("pt-BR") ?? "—"} votos · {Number(r.percentage).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prestação de contas + Meta Ads */}
        {(finance || digitalAds.length > 0) && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Banknote className="h-4 w-4 text-primary" />
              <h2 className="text-xl font-bold">Financeiro de campanha</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {finance && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Prestação de contas TSE</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Arrecadado</span><span className="font-mono font-bold">{fmtBig(Number(finance.total_received))}</span></div>
                    <div className="flex justify-between"><span>Gasto</span><span className="font-mono">{fmtBig(Number(finance.total_spent))}</span></div>
                    <div className="flex justify-between"><span>Fundo Partidário</span><span className="font-mono text-muted-foreground">{fmtBig(Number(finance.fund_partidario))}</span></div>
                    <div className="flex justify-between"><span>Fundo Eleitoral (FEFC)</span><span className="font-mono text-muted-foreground">{fmtBig(Number(finance.fund_especial))}</span></div>
                  </div>
                </div>
              )}
              {digitalAds.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Megaphone className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Propaganda digital
                    </p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-border/40 pb-2">
                      <span className="font-medium">Total cross-platform</span>
                      <span className="font-mono font-bold">
                        {spendMin === spendMax
                          ? fmtBig(spendMin)
                          : `${fmtBig(spendMin)} – ${fmtBig(spendMax)}`}
                      </span>
                    </div>
                    {platformStats.map((p) => (
                      <div key={p.platform} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {PLATFORM_LABELS[p.platform] ?? p.platform}
                          <span className="ml-1 text-[10px] opacity-70">
                            · {p.count} ad{p.count === 1 ? "" : "s"}
                          </span>
                        </span>
                        <span className="font-mono">
                          {p.spendMin === p.spendMax
                            ? fmtBig(p.spendMin)
                            : `${fmtBig(p.spendMin)} – ${fmtBig(p.spendMax)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Histórico eleitoral (2018, 2022, 2024) */}
        {sortedPriorResults.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h2 className="text-xl font-bold">Histórico eleitoral</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Set(sortedPriorResults.map((r) => r.year)).size} eleições
              </span>
            </div>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {sortedPriorResults.slice(0, 10).map((r, i) => {
                const isElected = r.result_status === "eleito";
                const is2T = r.result_status === "2t_disputou";
                const Icon = isElected ? Trophy : XCircleIcon;
                const cor = isElected ? "text-positive" : is2T ? "text-warning" : "text-muted-foreground";
                const cargoLabel: Record<string, string> = {
                  presidente: "Presidente",
                  governador: "Governador",
                  senador: "Senador",
                  prefeito: "Prefeito",
                  vereador: "Vereador",
                  deputado_federal: "Deputado Federal",
                  deputado_estadual: "Deputado Estadual",
                  deputado_distrital: "Deputado Distrital",
                  "vice-presidente": "Vice-Presidente",
                  "vice-governador": "Vice-Governador",
                  "vice-prefeito": "Vice-Prefeito",
                };
                const statusLabel: Record<string, string> = {
                  eleito: "Eleito",
                  nao_eleito: "Não eleito",
                  suplente: "Suplente",
                  "2t_disputou": "Disputou 2º turno",
                  renunciou: "Renunciou",
                  cassado: "Cassado",
                };
                return (
                  <div
                    key={r.id}
                    className={`flex items-center px-4 py-3 text-sm border-b border-border/30 last:border-0 ${i % 2 ? "bg-muted/15" : ""}`}
                  >
                    <span className="w-12 font-mono font-bold tabular-nums text-muted-foreground">
                      {r.year}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 ${cor} shrink-0`} />
                        <span className="font-semibold text-sm">
                          {cargoLabel[r.election_type] ?? r.election_type}
                        </span>
                        {r.state && (
                          <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 bg-muted/40 rounded-sm">
                            {r.state}
                            {r.city && ` · ${r.city}`}
                          </span>
                        )}
                        {r.round > 1 && (
                          <span className="text-[10px] font-mono text-warning px-1.5 py-0.5 bg-warning/10 rounded-sm">
                            2º turno
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {r.party ?? "—"} · <span className={cor}>{statusLabel[r.result_status] ?? r.result_status}</span>
                      </p>
                    </div>
                    <span className="font-mono font-bold tabular-nums text-sm shrink-0">
                      {r.total_votes.toLocaleString("pt-BR")} votos
                    </span>
                  </div>
                );
              })}
              {sortedPriorResults.length > 10 && (
                <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/20 text-center">
                  + {sortedPriorResults.length - 10} resultados anteriores
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Fonte: TSE — Votação por Município/Zona 2018, 2022, 2024 (totais agregados nacionalmente).
            </p>
          </section>
        )}

        {/* Patrimônio declarado (TSE bens) */}
        {latestAssets.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" />
                <h2 className="text-xl font-bold">Patrimônio declarado</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Eleição {latestAssetsYear} · {latestAssets.length} bem{latestAssets.length === 1 ? "" : "s"} · TSE
              </span>
            </div>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total declarado</span>
                <span className="text-2xl font-mono font-bold tabular-nums">{fmtBig(totalNetWorth)}</span>
              </div>
              <div className="divide-y divide-border/30 text-sm">
                {[...latestAssets]
                  .sort((a, b) => Number(b.value_brl ?? 0) - Number(a.value_brl ?? 0))
                  .slice(0, 15)
                  .map((a) => (
                    <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
                          {a.asset_type_name ?? "Bem"}
                        </p>
                        <p className="text-sm text-foreground line-clamp-2">{a.description ?? "—"}</p>
                      </div>
                      <span className="font-mono font-bold tabular-nums shrink-0">
                        {fmtBig(Number(a.value_brl ?? 0))}
                      </span>
                    </div>
                  ))}
                {latestAssets.length > 15 && (
                  <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/20 text-center">
                    + {latestAssets.length - 15} bens menores não exibidos
                  </div>
                )}
              </div>
              <div className="px-4 py-2 border-t border-border bg-muted/20 text-[10px] font-mono text-muted-foreground">
                Fonte: TSE — Bem Candidato {latestAssetsYear}. Valores declarados pelo próprio candidato.
              </div>
            </div>
          </section>
        )}

        {/* Redes sociais oficiais (TSE) */}
        {latestSocial.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <h2 className="text-xl font-bold">Redes sociais oficiais</h2>
              </div>
              <span className="text-xs text-muted-foreground">Declaradas no TSE {latestSocialYear}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {latestSocial.map((s) => (
                <a
                  key={s.id}
                  href={s.url.startsWith("http") ? s.url : `https://${s.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors group"
                >
                  <span className="text-xs uppercase tracking-wider font-bold text-primary w-20 shrink-0">
                    {s.platform}
                  </span>
                  <span className="text-sm font-mono truncate flex-1">
                    {s.handle ? `@${s.handle}` : s.url.replace(/^https?:\/\//, "").slice(0, 50)}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* FEFC — Fundo Especial */}
        {latestFefc && Number(latestFefc.amount_received) > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <h2 className="text-xl font-bold">Fundo Eleitoral (FEFC) recebido</h2>
              </div>
              <span className="text-xs text-muted-foreground">Eleição {latestFefc.election_year}</span>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-3xl font-mono font-bold tabular-nums text-foreground">
                {fmtBig(Number(latestFefc.amount_received))}
              </p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Valor repassado pelo {latestFefc.party_acronym ?? "partido"} a partir do Fundo Especial
                de Financiamento de Campanha — recursos públicos do Tesouro Nacional distribuídos
                aos partidos para custear campanhas eleitorais.
              </p>
              <Link
                href="/fefc"
                className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline font-mono"
              >
                Ver ranking completo FEFC <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </section>
        )}

        {/* Alerta de Sanção CEIS — fornecedor CEAP está em CEIS ativo */}
        {ceisMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h2 className="text-xl font-bold text-warning">
                Alerta: fornecedores com sanção ativa (CEIS)
              </h2>
            </div>
            <div className="rounded-lg border-2 border-warning/40 bg-warning/5 p-4">
              <p className="text-sm text-foreground mb-3 leading-relaxed">
                {ceisMatches.length === 1 ? "Um fornecedor" : `${ceisMatches.length} fornecedores`} da
                Cota Parlamentar deste candidato {ceisMatches.length === 1 ? "está" : "estão"} no{" "}
                <Link href="/sancoes" className="text-warning underline font-semibold">
                  Cadastro Nacional de Empresas Inidôneas e Suspensas (CEIS)
                </Link>{" "}
                — impedidas de contratar com o poder público.
              </p>
              <div className="space-y-2">
                {ceisMatches.map((m) => (
                  <div key={m.sancao.id} className="rounded-md bg-card border border-warning/30 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="font-semibold">{m.fornecedor}</p>
                      <span className="font-mono font-bold tabular-nums text-warning shrink-0">
                        {fmtBig(m.totalCeap)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {m.cnpj && <>CNPJ {m.cnpj} · </>}
                      {m.countCeap} pagamentos via CEAP
                    </p>
                    <div className="text-xs text-warning/90 mt-2 pt-2 border-t border-warning/20">
                      <p className="font-medium">{m.sancao.tipo_sancao ?? "Sanção registrada"}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Sanção por {m.sancao.orgao_sancionador ?? "—"}
                        {m.sancao.data_inicio && <> · desde {new Date(m.sancao.data_inicio).toLocaleDateString("pt-BR")}</>}
                        {m.sancao.data_fim && <> até {new Date(m.sancao.data_fim).toLocaleDateString("pt-BR")}</>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                Fonte: CGU — Portal da Transparência (CEIS) cruzado com Cota Parlamentar Câmara.
                Estar em CEIS não implica em irregularidade do candidato — é alerta de risco reputacional do fornecedor.
              </p>
            </div>
          </section>
        )}

        {/* Cota Parlamentar (CEAP) — só aparece se candidato é deputado federal */}
        {ceap && (
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
        )}

        {/* Atividade legislativa — agrupada por tópico */}
        {votes.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Vote className="h-4 w-4 text-primary" />
                <h2 className="text-xl font-bold">Atividade legislativa</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {votes.length} votos · agrupados por tema
              </span>
            </div>
            <div className="space-y-4">
              {sortedTopics.map(([topic, list]) => (
                <div key={topic} className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                    <span className="text-xs uppercase tracking-wider font-semibold">{topic}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {list.filter((v) => v.vote === "Sim").length} Sim ·{" "}
                      {list.filter((v) => v.vote === "Não").length} Não ·{" "}
                      {list.filter((v) => v.vote === "Abstenção").length} Abst.
                    </span>
                  </div>
                  {list.slice(0, 4).map((v, i) => (
                    <div
                      key={v.id}
                      className={`flex items-start gap-3 px-3 py-2.5 text-sm border-b border-border/30 last:border-0 ${
                        i % 2 ? "bg-muted/15" : ""
                      }`}
                    >
                      <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">
                        {new Date(v.vote_date).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="flex-1 line-clamp-2">{v.bill_title}</span>
                      <span
                        className={`text-xs font-mono px-1.5 py-0.5 rounded shrink-0 ${
                          v.vote === "Sim"
                            ? "bg-positive/15 text-positive"
                            : v.vote === "Não"
                            ? "bg-negative/15 text-negative"
                            : "bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        {v.vote}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Processos / menções judiciais */}
        {relevantProceedings.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-warning" />
                <h2 className="text-xl font-bold">Menções judiciais relevantes</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Detectadas em fontes públicas
              </span>
            </div>
            <div className="space-y-2">
              {relevantProceedings.map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{p.process_class}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">
                          {p.court}
                        </span>
                      </div>
                      {p.process_subject && (
                        <p className="text-xs text-muted-foreground mt-1.5 italic leading-relaxed">
                          {p.process_subject}
                        </p>
                      )}
                      {p.current_status && (
                        <p className="text-xs text-muted-foreground mt-1">{p.current_status}</p>
                      )}
                      {p.process_number && (
                        <p className="text-xs font-mono text-muted-foreground mt-1">
                          Processo: {p.process_number}
                        </p>
                      )}
                    </div>
                    {p.source_url && (
                      <a
                        href={p.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                      >
                        Fonte <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              ⚠️ Menções extraídas de fontes públicas (Wikipedia, releases oficiais). Não constituem
              acusação nem condenação. Para apuração formal, consulte os tribunais.
            </p>
          </section>
        )}

        {/* Footer / fontes */}
        <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            <strong>Fontes:</strong> TSE DivulgaCandContas · Câmara dos Deputados · Senado Federal · DataJud (CNJ) · Meta Ad Library · Pesquisas registradas no TSE.
          </p>
          <p className="mt-2">
            Última atualização: {new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </p>
        </footer>
      </main>
    </div>
  );
}
