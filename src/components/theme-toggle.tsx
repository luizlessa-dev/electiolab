"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={compact ? "h-7 w-7" : "h-8 w-8"} />;
  }

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`flex items-center justify-center rounded-md border border-border bg-card hover:bg-accent transition-colors ${
        compact ? "h-7 w-7" : "h-8 w-8"
      }`}
      aria-label={isDark ? "Mudar para claro" : "Mudar para escuro"}
      title={isDark ? "Mudar para claro" : "Mudar para escuro"}
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}
