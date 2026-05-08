"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  BarChart3,
  Building2,
  DollarSign,
  FileSearch,
  Home,
  Banknote,
  TrendingUp,
} from "lucide-react";

interface CmdItem {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string;
}

interface Election {
  id: string;
  name: string;
  type: string;
  state?: string | null;
  year: number;
  round: number;
}

const STATIC_ITEMS: CmdItem[] = [
  { id: "home", label: "Visão geral", href: "/dashboard", icon: Home, keywords: "dashboard inicio" },
  { id: "polls", label: "Pesquisas", href: "/dashboard/pesquisas", icon: FileSearch, keywords: "pesquisas datafolha quaest atlas" },
  { id: "institutes", label: "Institutos", href: "/dashboard/institutos", icon: Building2, keywords: "institutos ranking confiabilidade" },
  { id: "money", label: "Financeiro", href: "/dashboard/dinheiro", icon: DollarSign, keywords: "dinheiro fundos meta ads campanha" },
  { id: "trend", label: "Tendência", href: "/dashboard?tab=trend", icon: TrendingUp, keywords: "tendencia evolucao temporal" },
  { id: "fundos", label: "Fundos Eleitorais", href: "/dashboard/dinheiro#fundos", icon: Banknote, keywords: "fundo partidario fefc dinheiro publico" },
];

export function CommandPalette() {
  const [elections, setElections] = useState<Election[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Lazy-load elections quando o palette abrir
  useEffect(() => {
    if (!open || elections.length > 0) return;
    fetch("/api/v1/elections")
      .then((r) => r.json())
      .then((d) => setElections(d.data ?? []))
      .catch(() => {});
  }, [open, elections.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm animate-slide-up"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl mx-4"
      >
        <Command
          label="Buscar"
          className="rounded-lg border border-border bg-popover shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Buscar candidato, eleição, página..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado.
            </Command.Empty>
            <Command.Group heading="Páginas" className="text-xs uppercase tracking-wider text-muted-foreground px-2 py-1">
              {STATIC_ITEMS.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.keywords ?? ""}`}
                  onSelect={() => go(item.href)}
                  className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
            {elections.length > 0 && (
              <Command.Group heading="Eleições" className="text-xs uppercase tracking-wider text-muted-foreground px-2 py-1 mt-2">
                {elections.map((e) => (
                  <Command.Item
                    key={e.id}
                    value={`${e.name} ${e.state ?? ""} ${e.type}`}
                    onSelect={() => go(`/dashboard?election=${e.id}`)}
                    className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{e.name}</span>
                    {e.state && (
                      <span className="text-xs font-mono text-muted-foreground uppercase">
                        {e.state}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
          <div className="border-t border-border px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Buscar com ⌘K · Navegar com ↑↓ · Selecionar com ↵</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
