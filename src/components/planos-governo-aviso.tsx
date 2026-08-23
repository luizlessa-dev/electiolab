import { AlertTriangle } from "lucide-react";

// Componente pequeno, mas compartilhado de propósito: o texto precisa ser
// idêntico nas duas páginas públicas (índice e tema) — é um aviso editorial
// obrigatório (plano de governo é promessa, não ato registrado; texto é
// síntese por IA, não citação literal — mudança de 2026-08-24), não um
// texto solto que cada página pode divergir.
export function PlanosGovernoAviso() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Plano de governo é promessa de campanha, não um ato registrado.</strong>{" "}
        Os textos abaixo são uma síntese gerada por IA, com base estrita nos trechos do documento oficial anexado ao
        registro de candidatura no TSE — não é citação literal. Página e link do PDF original acompanham cada
        síntese pra conferência. Não houve execução, votação ou qualquer verificação de cumprimento; nada aqui deve
        ser confundido com o que o candidato de fato fez em mandatos anteriores.
      </p>
    </div>
  );
}
