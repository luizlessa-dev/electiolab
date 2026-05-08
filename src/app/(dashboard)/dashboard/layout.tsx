"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  DollarSign,
  FileSearch,
  LayoutDashboard,
  ExternalLink,
  Activity,
  Search,
  Key,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";

const navItems = [
  { href: "/dashboard",            label: "Overview",   icon: LayoutDashboard },
  { href: "/dashboard/pesquisas",  label: "Pesquisas",  icon: FileSearch },
  { href: "/dashboard/institutos", label: "Institutos", icon: Building2 },
  { href: "/dashboard/dinheiro",   label: "Financeiro", icon: DollarSign },
  { href: "/candidatos",           label: "Candidatos", icon: Users },
  { href: "/comparar",             label: "Comparar",   icon: Activity },
  { href: "/dashboard/alertas",    label: "Alertas",    icon: Activity },
  { href: "/dashboard/api",        label: "API Key",    icon: Key },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeLabel = navItems.find((n) => n.href === pathname)?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen bg-background">
      <CommandPalette />

      {/* ── Sidebar desktop ───────────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-col fixed inset-y-0 left-0 z-30 bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground tracking-tight leading-none">ElectioLab</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest">Terminal</p>
          </div>
        </div>

        <div className="mx-4 h-px bg-sidebar-border" />

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Análise
          </p>
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                  active
                    ? "bg-accent text-accent-foreground border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent border-transparent"
                }`}
              >
                <item.icon
                  className={`h-4 w-4 flex-shrink-0 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                {item.label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 space-y-3 border-t border-sidebar-border">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Ver site
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-positive opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-positive" />
              </span>
              <span className="text-[11px] text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR")}
              </span>
            </div>
            <ThemeToggle compact />
          </div>
        </div>
      </aside>

      {/* ── Área principal ────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 md:ml-56">
        {/* Topbar — desktop */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 sticky top-0 z-20 glass">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span>{activeLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <CommandPaletteButton />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-positive/10 border border-positive/20">
              <span className="animate-pulse-live w-1.5 h-1.5 rounded-full bg-positive inline-block" />
              <span className="text-[11px] text-positive font-medium">Ao vivo</span>
            </div>
            <Link
              href="/precos"
              className="text-xs px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors"
            >
              Upgrade Pro
            </Link>
          </div>
        </header>

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-20 bg-background border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-foreground">ElectioLab</span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-2 rounded-lg transition-colors ${
                    active ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={item.label}
                >
                  <item.icon className="h-4 w-4" />
                </Link>
              );
            })}
            <ThemeToggle compact />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

/* ─── Botão "Buscar" abre o command palette via Cmd+K simulado ─── */
function CommandPaletteButton() {
  return (
    <button
      onClick={() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        );
      }}
      className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card hover:bg-accent transition-colors text-xs text-muted-foreground"
      aria-label="Buscar (Cmd+K)"
    >
      <Search className="h-3 w-3" />
      <span>Buscar...</span>
      <kbd className="ml-2 text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border">
        ⌘K
      </kbd>
    </button>
  );
}
