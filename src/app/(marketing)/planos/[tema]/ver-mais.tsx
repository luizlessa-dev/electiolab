"use client";

import { useState } from "react";

// Único pedaço client desta página — o resto é Server Component. Isolado
// aqui pra não converter a página inteira em client só por causa de um toggle.
export function VerMais({ textoEstendido }: { textoEstendido: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="mt-1.5">
      <button onClick={() => setAberto((v) => !v)} className="text-xs text-muted-foreground underline hover:text-foreground">
        {aberto ? "ver menos" : "ver mais"}
      </button>
      {aberto && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{textoEstendido}</p>
      )}
    </div>
  );
}
