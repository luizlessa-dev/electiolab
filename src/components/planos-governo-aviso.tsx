import { AlertTriangle } from "lucide-react";

// Componente pequeno, mas compartilhado de propósito: o texto precisa ser
// idêntico nas duas páginas públicas (índice e tema) — é um aviso editorial
// obrigatório (plano de governo é promessa, não ato registrado), não um
// texto solto que cada página pode divergir.
export function PlanosGovernoAviso() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Plano de governo é promessa de campanha, não um ato registrado.</strong>{" "}
        Os trechos abaixo são cópia literal do documento oficial anexado ao registro de candidatura no TSE — não
        houve execução, votação ou qualquer verificação de cumprimento. Nada aqui deve ser confundido com o que o
        candidato de fato fez em mandatos anteriores.
      </p>
    </div>
  );
}
