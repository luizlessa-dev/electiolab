import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  Mail,
  ArrowRight,
} from "lucide-react";
import { NewsletterSignup } from "@/components/newsletter/signup-form";

export const metadata: Metadata = {
  title: "Sinal Eleitoral — Newsletter semanal de pesquisas eleitorais | ElectioLab",
  description:
    "Toda segunda-feira: média ponderada atualizada, ranking de institutos por acurácia e os movimentos que importam nas eleições 2026. Grátis.",
  alternates: { canonical: "https://electiolab.com/newsletter" },
  openGraph: {
    title: "Sinal Eleitoral — A newsletter eleitoral mais rigorosa do Brasil",
    description:
      "Dados sem viés. Toda segunda-feira no seu email, grátis.",
    url: "https://electiolab.com/newsletter",
  },
};

const BENEFICIOS = [
  {
    icon: BarChart3,
    titulo: "Média ponderada atualizada",
    descricao:
      "Não uma pesquisa, todas. Cada edição traz a média ponderada por recência, tamanho de amostra e histórico de acurácia do instituto.",
  },
  {
    icon: Award,
    titulo: "Ranking de institutos",
    descricao:
      "Quem errou e quem acertou nas últimas eleições. Saiba quais pesquisas merecem mais peso antes de ler qualquer manchete.",
  },
  {
    icon: TrendingUp,
    titulo: "Movimentos que importam",
    descricao:
      "Variações dentro da margem de erro não são notícia. Sinalizamos só quando há movimento real — com contexto estatístico.",
  },
  {
    icon: Clock,
    titulo: "Sem perda de tempo",
    descricao:
      "Uma edição por semana, toda segunda-feira. Leitura de 4 minutos com o essencial para quem acompanha política com seriedade.",
  },
];

const EXEMPLOS = [
  "Como calcular se uma queda de 3 pontos é real ou é ruído",
  "Os 5 institutos com menor erro médio nas eleições de 2022",
  "Governadores: qual cenário ainda está indefinido a 90 dias do 1º turno",
  "Senado 2026: os 3 estados onde a segunda vaga ainda não tem dono",
];

export default function NewsletterPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav mínima */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="font-bold text-base tracking-tight">
            ElectioLab
          </Link>
          <span className="text-muted-foreground text-sm hidden sm:inline">
            / Sinal Eleitoral
          </span>
          <div className="ml-auto">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terminal →
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <Mail className="h-3 w-3" />
            Newsletter gratuita · toda segunda-feira
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5 leading-tight">
            Sinal Eleitoral
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto">
            A única newsletter que agrega{" "}
            <strong className="text-foreground">todas as pesquisas</strong>, pondera
            por acurácia dos institutos e filtra o ruído estatístico antes de te contar
            o que mudou.
          </p>
          <div className="max-w-sm mx-auto">
            <NewsletterSignup variant="card" source="newsletter-page-hero" />
          </div>
        </section>

        {/* Benefícios */}
        <section className="border-t border-border bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 py-14">
            <h2 className="text-xl font-semibold text-center mb-10">
              O que você recebe toda segunda-feira
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {BENEFICIOS.map(({ icon: Icon, titulo, descricao }) => (
                <div
                  key={titulo}
                  className="flex gap-4 rounded-lg border border-border bg-card p-5"
                >
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{titulo}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {descricao}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Exemplos de edições */}
        <section className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-xl font-semibold mb-8 text-center">
            Edições recentes
          </h2>
          <ul className="space-y-3">
            {EXEMPLOS.map((titulo) => (
              <li
                key={titulo}
                className="flex items-start gap-3 py-3 border-b border-border last:border-0"
              >
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">{titulo}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground text-center mt-6">
            Arquivo completo disponível em breve.
          </p>
        </section>

        {/* CTA final */}
        <section className="border-t border-border bg-muted/30">
          <div className="max-w-xl mx-auto px-4 py-14 text-center">
            <h2 className="text-2xl font-bold mb-3">Assine grátis</h2>
            <p className="text-muted-foreground text-sm mb-8">
              Sem spam. Você pode cancelar a qualquer momento com um clique.
              Compatível com LGPD.
            </p>
            <div className="max-w-sm mx-auto">
              <NewsletterSignup variant="card" source="newsletter-page-footer" />
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              Prefere ver os dados diretamente?{" "}
              <Link
                href="/dashboard"
                className="text-primary underline-offset-4 hover:underline inline-flex items-center gap-1"
              >
                Acesse o Terminal ElectioLab <ArrowRight className="h-3 w-3" />
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} ElectioLab · Inteligência Eleitoral</span>
          <div className="flex gap-4">
            <Link href="/privacidade" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-foreground transition-colors">
              Termos
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Site
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
