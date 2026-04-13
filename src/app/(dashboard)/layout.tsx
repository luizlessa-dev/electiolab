import Link from "next/link";
import {
  BarChart3,
  Building2,
  DollarSign,
  FileSearch,
  Home,
  TrendingUp,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Visao Geral", icon: Home },
  { href: "/pesquisas", label: "Pesquisas", icon: FileSearch },
  { href: "/institutos", label: "Institutos", icon: Building2 },
  { href: "/dinheiro", label: "Dinheiro", icon: DollarSign },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="p-6 border-b">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">ElectioLab</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">
            Inteligencia Eleitoral
          </p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Dados atualizados em tempo real</span>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-col flex-1">
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold">ElectioLab</span>
          </Link>
          <nav className="flex gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                title={item.label}
              >
                <item.icon className="h-4 w-4" />
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
