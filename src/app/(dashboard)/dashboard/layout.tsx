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
} from "lucide-react";

const navItems = [
  { href: "/dashboard",            label: "Overview",   icon: LayoutDashboard },
  { href: "/dashboard/pesquisas",  label: "Pesquisas",  icon: FileSearch },
  { href: "/dashboard/institutos", label: "Institutos", icon: Building2 },
  { href: "/dashboard/dinheiro",   label: "Financeiro", icon: DollarSign },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Sidebar desktop ───────────────────────────────── */}
      <aside
        className="hidden md:flex w-56 flex-col fixed inset-y-0 left-0 z-30"
        style={{ background: "var(--sidebar)", borderRight: "1px solid #1a2030" }}
      >
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight leading-none">ElectioLab</p>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">Terminal</p>
          </div>
        </div>

        <div className="mx-4 h-px" style={{ background: "#1a2030" }} />

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-slate-600 font-semibold">
            Análise
          </p>
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-blue-600/15 text-blue-300 border border-blue-600/20"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent"
                }`}
              >
                <item.icon
                  className={`h-4 w-4 flex-shrink-0 ${
                    active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                {item.label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 space-y-3" style={{ borderTop: "1px solid #1a2030" }}>
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Ver site
          </Link>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[11px] text-slate-500">
              {new Date().toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Área principal ────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 md:ml-56">

        {/* Topbar */}
        <header
          className="hidden md:flex items-center justify-between px-6 py-3 sticky top-0 z-20 backdrop-blur-sm"
          style={{ background: "rgba(15,17,23,0.85)", borderBottom: "1px solid #1a2030" }}
        >
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Activity className="h-3.5 w-3.5 text-blue-400" />
            <span>{navItems.find((n) => n.href === pathname)?.label ?? "Dashboard"}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                 style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <span className="animate-pulse-live w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              <span className="text-[11px] text-green-400 font-medium">Ao vivo</span>
            </div>
            <Link
              href="/precos"
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
            >
              Upgrade Pro
            </Link>
          </div>
        </header>

        {/* Mobile header */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-20"
          style={{ background: "var(--background)", borderBottom: "1px solid #1a2030" }}
        >
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <BarChart3 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-white">ElectioLab</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-2 rounded-lg transition-colors ${
                    active ? "bg-blue-600/20 text-blue-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                  title={item.label}
                >
                  <item.icon className="h-4 w-4" />
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
