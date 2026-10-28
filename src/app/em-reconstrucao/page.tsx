import type { Metadata } from "next";
import { Hammer } from "lucide-react";

export const metadata: Metadata = {
  title: "Em reformulação | ElectioLab",
  description: "O ElectioLab está em reformulação para as próximas eleições.",
  robots: { index: false, follow: false },
};

export default function EmReconstrucaoPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-xl text-center space-y-4">
        <Hammer className="mx-auto h-8 w-8 text-warning" />
        <h1 className="text-2xl font-bold text-foreground">O ElectioLab está em reformulação</h1>
        <p className="text-muted-foreground">
          Estamos reconstruindo o site para acompanhar as próximas eleições importantes no Brasil e no mundo.
          Enquanto isso, o acesso às páginas e à API está suspenso.
        </p>
        <p className="text-sm text-muted-foreground">Volte em breve.</p>
      </div>
    </main>
  );
}
