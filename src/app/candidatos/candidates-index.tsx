"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowUpDown,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

type Candidate = {
  id: string;
  slug: string;
  name: string;
  party: string | null;
  color: string | null;
  current_position: string | null;
  bio: string | null;
  photo_url: string | null;
  tse_last_situation: string | null;
  birth_date: string | null;
  weighted_average: number | null;
  election: { type: string; state: string | null; year: number; name: string } | null;
};

export type InitialFilters = {
  query: string;
  type: "all" | "presidente" | "governador" | "senador";
  uf: string;
  party: string;
  tse: "all" | "apto" | "inapto" | "unknown";
  hasBio: boolean;
  hasPhoto: boolean;
  sortKey: "name" | "average" | "age";
  sortDir: "asc" | "desc";
  page: number;
};

type Props = { candidates: Candidate[]; initial: InitialFilters };

const TYPE_LABEL: Record<string, string> = {
  presidente: "Presidente",
  governador: "Governador",
  senador: "Senador",
};
const STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
];

const PAGE_SIZE = 24;

type SortKey = "name" | "average" | "age";
type SortDir = "asc" | "desc";
type TseFilter = "all" | "apto" | "inapto" | "unknown";

const DEFAULT_SORT_DIR: Record<SortKey, SortDir> = {
  name: "asc",
  average: "desc",
  age: "asc",
};

function ageOf(birth: string | null): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
}

export function CandidatesIndex({ candidates, initial }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // Estado inicial vem das props (server-side reads searchParams)
  const [query, setQuery] = useState(initial.query);
  const [type, setType] = useState<InitialFilters["type"]>(initial.type);
  const [uf, setUf] = useState(initial.uf);
  const [party, setParty] = useState(initial.party);
  const [tse, setTse] = useState<TseFilter>(initial.tse);
  const [hasBio, setHasBio] = useState<boolean>(initial.hasBio);
  const [hasPhoto, setHasPhoto] = useState<boolean>(initial.hasPhoto);
  const [sortKey, setSortKey] = useState<SortKey>(initial.sortKey);
  const [sortDir, setSortDir] = useState<SortDir>(initial.sortDir);
  const [page, setPage] = useState<number>(initial.page);

  // Sincroniza estado → URL (replace, sem novo entry no histórico)
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (type !== "all") params.set("type", type);
    if (uf !== "all") params.set("uf", uf);
    if (party !== "all") params.set("partido", party);
    if (tse !== "all") params.set("tse", tse);
    if (hasBio) params.set("bio", "1");
    if (hasPhoto) params.set("foto", "1");
    if (sortKey !== "name") params.set("sort", sortKey);
    if (sortDir !== DEFAULT_SORT_DIR[sortKey]) params.set("dir", sortDir);
    if (page > 1) params.set("page", String(page));

    const qs = params.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    // scroll: false → não pula pro topo a cada filtro
    router.replace(target, { scroll: false });
  }, [query, type, uf, party, tse, hasBio, hasPhoto, sortKey, sortDir, page, pathname, router]);

  const parties = useMemo(() => {
    const set = new Set<string>();
    for (const c of candidates) if (c.party) set.add(c.party);
    return Array.from(set).sort();
  }, [candidates]);

  const enriched = useMemo(
    () => candidates.map((c) => ({ ...c, _age: ageOf(c.birth_date) })),
    [candidates]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (type !== "all" && c.election?.type !== type) return false;
      if (uf !== "all" && c.election?.state !== uf) return false;
      if (party !== "all" && c.party !== party) return false;
      if (tse === "apto" && c.tse_last_situation !== "APTO") return false;
      if (tse === "inapto" && c.tse_last_situation !== "INAPTO") return false;
      if (tse === "unknown" && c.tse_last_situation) return false;
      if (hasBio && !c.bio) return false;
      if (hasPhoto && !c.photo_url) return false;
      return true;
    });
  }, [enriched, query, type, uf, party, tse, hasBio, hasPhoto]);

  const sorted = useMemo(() => {
    const arr = filtered.slice();
    const dirMul = sortDir === "asc" ? 1 : -1;
    if (sortKey === "name") {
      arr.sort((a, b) => a.name.localeCompare(b.name, "pt-BR") * dirMul);
    } else if (sortKey === "average") {
      arr.sort((a, b) => {
        const aHas = a.weighted_average !== null && a.weighted_average !== undefined;
        const bHas = b.weighted_average !== null && b.weighted_average !== undefined;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        if (!aHas && !bHas) return a.name.localeCompare(b.name, "pt-BR");
        return ((a.weighted_average ?? 0) - (b.weighted_average ?? 0)) * dirMul;
      });
    } else if (sortKey === "age") {
      arr.sort((a, b) => {
        const aHas = a._age !== null;
        const bHas = b._age !== null;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        if (!aHas && !bHas) return a.name.localeCompare(b.name, "pt-BR");
        return ((a._age ?? 0) - (b._age ?? 0)) * dirMul;
      });
    }
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasFilter =
    query || type !== "all" || uf !== "all" || party !== "all" ||
    tse !== "all" || hasBio || hasPhoto;

  const reset = useCallback(() => {
    setQuery("");
    setType("all");
    setUf("all");
    setParty("all");
    setTse("all");
    setHasBio(false);
    setHasPhoto(false);
    setSortKey("name");
    setSortDir("asc");
    setPage(1);
  }, []);

  // Reset paginação quando filtro/sort muda
  useEffect(() => {
    setPage(1);
  }, [query, type, uf, party, tse, hasBio, hasPhoto, sortKey, sortDir]);

  // Click em sort: se já é o ativo → inverte direção; senão → vira ativo com direção default
  const onSortClick = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir(DEFAULT_SORT_DIR[key]);
      }
    },
    [sortKey]
  );

  const sortLabels: Record<SortKey, { asc: string; desc: string }> = {
    name: { asc: "Nome A-Z", desc: "Nome Z-A" },
    average: { asc: "% média ↑", desc: "% média ↓" },
    age: { asc: "Idade ↑", desc: "Idade ↓" },
  };

  return (
    <>
      {/* Filtros */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="grid md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome..."
              className="w-full pl-9 pr-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="px-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Cargo"
          >
            <option value="all">Todos os cargos</option>
            <option value="presidente">Presidente</option>
            <option value="governador">Governador</option>
            <option value="senador">Senador</option>
          </select>

          <select
            value={uf}
            onChange={(e) => setUf(e.target.value)}
            className="px-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="UF"
          >
            <option value="all">Todas UFs</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={party}
            onChange={(e) => setParty(e.target.value)}
            className="px-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring max-w-[140px]"
            aria-label="Partido"
          >
            <option value="all">Todos partidos</option>
            {parties.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={tse}
            onChange={(e) => setTse(e.target.value as TseFilter)}
            className="px-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Situação TSE"
            title="Situação TSE (Ficha Limpa)"
          >
            <option value="all">Situação TSE</option>
            <option value="apto">✓ Apto</option>
            <option value="inapto">⚠ Indeferido</option>
            <option value="unknown">— Sem registro</option>
          </select>

          {hasFilter && (
            <button
              onClick={reset}
              className="px-3 py-2 rounded-md text-xs font-medium border border-border hover:bg-muted/50 flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Limpar
            </button>
          )}
        </div>

        {/* Toggles completude + sort */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setHasBio((v) => !v)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
                hasBio
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted/50"
              }`}
              title="Mostrar apenas candidatos com biografia escrita"
            >
              <FileText className="h-3 w-3" />
              Tem bio
            </button>
            <button
              onClick={() => setHasPhoto((v) => !v)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
                hasPhoto
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted/50"
              }`}
              title="Mostrar apenas candidatos com foto oficial TSE"
            >
              <ImageIcon className="h-3 w-3" />
              Tem foto
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Ordenar:</span>
            <div className="flex rounded-md border border-border overflow-hidden">
              {(["name", "average", "age"] as SortKey[]).map((key) => {
                const isActive = sortKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => onSortClick(key)}
                    title={isActive ? "Clique pra inverter direção" : undefined}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {sortLabels[key][isActive ? sortDir : DEFAULT_SORT_DIR[key]]}
                    {isActive &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Exibindo{" "}
          <span className="font-mono font-semibold">
            {sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, sorted.length)}
          </span>{" "}
          de <span className="font-mono font-semibold">{sorted.length}</span> candidato
          {sorted.length === 1 ? "" : "s"}
          {hasFilter && ` (de ${candidates.length} totais)`}
        </div>
      </div>

      {/* Grid */}
      {pageItems.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Nenhum candidato encontrado com esses filtros.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pageItems.map((c) => (
            <Link
              key={c.id}
              href={`/candidato/${c.slug}`}
              prefetch={true}
              className="group rounded-lg border border-border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all flex items-start gap-3"
            >
              <div
                className="w-1 self-stretch rounded-full"
                style={{ backgroundColor: c.color ?? "#6b7280" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                    {c.name}
                  </h3>
                  {c.tse_last_situation === "APTO" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-positive shrink-0" aria-label="Apto TSE" />
                  )}
                  {c.tse_last_situation === "INAPTO" && (
                    <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" aria-label="Indeferido TSE" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 flex-wrap">
                  {c.party && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border"
                      style={{ borderColor: c.color ?? undefined, color: c.color ?? undefined }}
                    >
                      {c.party}
                    </span>
                  )}
                  <span className="truncate">
                    {TYPE_LABEL[c.election?.type ?? ""] ?? c.election?.type}
                    {c.election?.state ? ` · ${c.election.state}` : ""}
                  </span>
                  {c._age !== null && <span>· {c._age} anos</span>}
                </div>
                <div className="flex items-center gap-3">
                  {c.weighted_average !== null && c.weighted_average !== undefined && (
                    <span
                      className="text-xs font-mono font-bold tabular-nums"
                      style={{ color: c.color ?? undefined }}
                      title="Média ponderada das pesquisas"
                    >
                      {Number(c.weighted_average).toFixed(1)}%
                    </span>
                  )}
                  {c.current_position && (
                    <p className="text-xs text-muted-foreground truncate">
                      {c.current_position}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="h-3 w-3" />
            Anterior
          </button>
          <PageNumbers current={safePage} total={totalPages} onPick={setPage} />
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Próxima
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </>
  );
}

function PageNumbers({
  current,
  total,
  onPick,
}: {
  current: number;
  total: number;
  onPick: (n: number) => void;
}) {
  const pages: (number | "...")[] = [];
  const push = (n: number | "...") => {
    if (pages[pages.length - 1] !== n) pages.push(n);
  };
  push(1);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i > 1 && i < total) {
      if (i > 2 && (pages[pages.length - 1] as number) < i - 1) push("...");
      push(i);
    }
  }
  if (total > 1) {
    if ((pages[pages.length - 1] as number) < total - 1) push("...");
    push(total);
  }

  return (
    <div className="flex items-center gap-1">
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="px-2 text-xs text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPick(p)}
            className={`min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors ${
              p === current
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:bg-muted/50"
            }`}
          >
            {p}
          </button>
        )
      )}
    </div>
  );
}
