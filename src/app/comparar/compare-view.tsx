"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Plus,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Briefcase,
  GraduationCap,
  Banknote,
  TrendingUp,
} from "lucide-react";

export type ComparedCandidate = {
  id: string;
  slug: string;
  name: string;
  full_name: string | null;
  party: string | null;
  color: string | null;
  current_position: string | null;
  photo_url: string | null;
  birth_date: string | null;
  profession: string | null;
  education: string | null;
  net_worth: number | null;
  bio: string | null;
  tse_last_situation: string | null;
  election: { type: string; state: string | null; year: number; name: string } | null;
  weighted_average: number | null;
  polls_included: number;
  latest_poll: {
    percentage: number;
    date: string | null;
    institute: string | null;
  } | null;
};

type Option = {
  slug: string;
  name: string;
  party: string | null;
  election_type: string;
  election_state: string | null;
};

type Props = {
  initialCandidates: ComparedCandidate[];
  options: Option[];
};

const SLOTS: Array<"a" | "b" | "c"> = ["a", "b", "c"];

function age(birth: string | null): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
}

function fmtMoney(v: number | null): string {
  if (v === null || v === undefined) return "—";
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)} mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

export function CompareView({ initialCandidates, options }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // Slot state — armazenamos slugs por slot
  const [slots, setSlots] = useState<(string | null)[]>([
    initialCandidates[0]?.slug ?? null,
    initialCandidates[1]?.slug ?? null,
    initialCandidates[2]?.slug ?? null,
  ]);
  const [candidates, setCandidates] = useState<ComparedCandidate[]>(initialCandidates);
  const [pickerOpen, setPickerOpen] = useState<number | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [copied, setCopied] = useState(false);

  // Sync URL ↔ slots
  useEffect(() => {
    const params = new URLSearchParams();
    slots.forEach((s, i) => {
      if (s) params.set(SLOTS[i], s);
    });
    const target = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(target, { scroll: false });
  }, [slots, pathname, router]);

  // Quando slots mudam, refetch via API client (apenas se mudou de fato)
  useEffect(() => {
    const wantedSlugs = slots.filter((s): s is string => Boolean(s));
    const haveSlugs = candidates.map((c) => c.slug);
    const changed =
      wantedSlugs.length !== haveSlugs.length ||
      wantedSlugs.some((s, i) => haveSlugs[i] !== s);
    if (!changed) return;

    if (wantedSlugs.length === 0) {
      setCandidates([]);
      return;
    }

    fetch(`/api/v1/candidates-by-slug?${wantedSlugs.map((s) => `slug=${s}`).join("&")}`)
      .then((r) => r.json())
      .then((d: { data?: ComparedCandidate[] }) => {
        const map = new Map((d.data ?? []).map((c) => [c.slug, c]));
        setCandidates(wantedSlugs.map((s) => map.get(s)).filter((x): x is ComparedCandidate => Boolean(x)));
      })
      .catch(() => {});
  }, [slots, candidates]);

  function setSlot(i: number, slug: string | null) {
    setSlots((prev) => {
      const next = [...prev];
      next[i] = slug;
      return next;
    });
    setPickerOpen(null);
    setPickerQuery("");
  }

  async function shareLink() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Comparativo ElectioLab",
          text: candidates.map((c) => c.name).join(" × "),
          url,
        });
        return;
      } catch {
        // user cancelou — cai no fallback
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const filteredOptions = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const taken = new Set(slots.filter(Boolean));
    return options
      .filter((o) => !taken.has(o.slug))
      .filter((o) => !q || o.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [options, pickerQuery, slots]);

  const filledCount = candidates.length;
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://electiolab.com${pathname}`;
  const shareText =
    candidates.length > 0
      ? `Comparativo: ${candidates.map((c) => c.name).join(" vs ")} — ElectioLab`
      : "Compare candidatos lado a lado — ElectioLab";

  return (
    <>
      {/* Slots row */}
      <div className="grid md:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => {
          const cand = candidates.find((c) => c.slug === slots[i]) ?? null;
          if (!cand) {
            return (
              <button
                key={i}
                onClick={() => setPickerOpen(i)}
                className="rounded-lg border-2 border-dashed border-border bg-card/50 p-6 hover:border-primary/50 hover:bg-card transition-colors flex flex-col items-center justify-center gap-2 min-h-[180px] text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-6 w-6" />
                <span className="text-sm font-medium">
                  Adicionar candidato {i + 1}
                </span>
              </button>
            );
          }
          return <CandidateSlotCard key={cand.slug} c={cand} onRemove={() => setSlot(i, null)} />;
        })}
      </div>

      {/* Compare table — só aparece com 2+ candidatos */}
      {filledCount >= 2 && <CompareTable candidates={candidates} />}

      {/* Share */}
      {filledCount >= 2 && (
        <div className="rounded-lg border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-medium">Compartilhar este comparativo</p>
            <p className="text-xs text-muted-foreground">
              URL preserva os candidatos selecionados.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={shareLink}
              className="px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {copied ? "Copiado" : "Compartilhar"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted/50 flex items-center gap-1.5"
              aria-label="Compartilhar no WhatsApp"
            >
              WhatsApp
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted/50 flex items-center gap-1.5"
              aria-label="Compartilhar no X (Twitter)"
            >
              X / Twitter
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-3 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted/50 flex items-center gap-1.5"
              aria-label="Copiar link"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar URL"}
            </button>
          </div>
        </div>
      )}

      {/* Picker modal */}
      {pickerOpen !== null && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
          onClick={() => setPickerOpen(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold">
                Escolher candidato (slot {pickerOpen + 1})
              </span>
              <button
                onClick={() => setPickerOpen(null)}
                className="p-1 hover:bg-muted/50 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="w-full pl-9 pr-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">Nenhum encontrado.</p>
              ) : (
                filteredOptions.map((o) => (
                  <button
                    key={o.slug}
                    onClick={() => setSlot(pickerOpen, o.slug)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 border-b border-border/30 last:border-0 flex items-center justify-between"
                  >
                    <span className="font-medium">{o.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {o.party} · {o.election_type}
                      {o.election_state ? ` ${o.election_state}` : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CandidateSlotCard({
  c,
  onRemove,
}: {
  c: ComparedCandidate;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 relative">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        aria-label="Remover"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-1 self-stretch rounded-full"
          style={{ backgroundColor: c.color ?? "#6b7280" }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              href={`/candidato/${c.slug}`}
              className="text-base font-semibold hover:text-primary transition-colors"
            >
              {c.name}
            </Link>
            {c.tse_last_situation === "APTO" && (
              <CheckCircle2 className="h-3.5 w-3.5 text-positive" aria-label="Apto" />
            )}
            {c.tse_last_situation === "INAPTO" && (
              <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-label="Indeferido" />
            )}
          </div>
          {c.party && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border"
              style={{ borderColor: c.color ?? undefined, color: c.color ?? undefined }}
            >
              {c.party}
            </span>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {c.election?.type ?? ""}
            {c.election?.state ? ` · ${c.election.state}` : ""} · {c.election?.year ?? ""}
          </p>
        </div>
      </div>
      {c.weighted_average !== null && (
        <div className="text-center py-2 border-y border-border">
          <p className="text-3xl font-mono font-bold tabular-nums" style={{ color: c.color ?? undefined }}>
            {Number(c.weighted_average).toFixed(1)}%
          </p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">
            média ponderada · {c.polls_included} pesquisa{c.polls_included === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}

function CompareTable({ candidates }: { candidates: ComparedCandidate[] }) {
  const ages = candidates.map((c) => age(c.birth_date));

  const rows: Array<{
    icon: typeof Calendar;
    label: string;
    values: string[];
  }> = [
    {
      icon: TrendingUp,
      label: "Pesquisa mais recente",
      values: candidates.map((c) =>
        c.latest_poll
          ? `${c.latest_poll.percentage}% · ${c.latest_poll.institute ?? "?"} · ${
              c.latest_poll.date ? new Date(c.latest_poll.date).toLocaleDateString("pt-BR") : "?"
            }`
          : "—"
      ),
    },
    {
      icon: Calendar,
      label: "Idade",
      values: ages.map((a) => (a !== null ? `${a} anos` : "—")),
    },
    {
      icon: Briefcase,
      label: "Cargo atual",
      values: candidates.map((c) => c.current_position ?? "—"),
    },
    {
      icon: Briefcase,
      label: "Profissão",
      values: candidates.map((c) => c.profession ?? "—"),
    },
    {
      icon: GraduationCap,
      label: "Escolaridade",
      values: candidates.map((c) => c.education ?? "—"),
    },
    {
      icon: Banknote,
      label: "Patrimônio declarado",
      values: candidates.map((c) => fmtMoney(c.net_worth)),
    },
    {
      icon: CheckCircle2,
      label: "Situação TSE",
      values: candidates.map((c) =>
        c.tse_last_situation === "APTO"
          ? "✓ Apto"
          : c.tse_last_situation === "INAPTO"
          ? "⚠ Indeferido"
          : "— Sem registro"
      ),
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3 bg-muted/30">
        <p className="text-sm font-semibold">Lado a lado</p>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.label}
              className={`grid gap-3 px-4 py-3 ${
                candidates.length === 2 ? "md:grid-cols-[160px_1fr_1fr]" : "md:grid-cols-[160px_1fr_1fr_1fr]"
              }`}
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                <Icon className="h-3.5 w-3.5" />
                {row.label}
              </div>
              {row.values.map((v, i) => (
                <div key={i} className="text-sm break-words">
                  {v}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Bios curtas se houver */}
      {candidates.some((c) => c.bio) && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Biografia
          </p>
          <div
            className={`grid gap-3 ${
              candidates.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
            }`}
          >
            {candidates.map((c) => (
              <p key={c.slug} className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">{c.name}:</strong>{" "}
                {c.bio ? c.bio.slice(0, 280) + (c.bio.length > 280 ? "…" : "") : "Sem biografia."}{" "}
                <Link
                  href={`/candidato/${c.slug}`}
                  className="text-primary hover:underline whitespace-nowrap"
                >
                  ver perfil →
                </Link>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
