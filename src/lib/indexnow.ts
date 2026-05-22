/**
 * IndexNow integration — pinga Bing/Yandex quando URLs novas ou atualizadas
 * são publicadas, reduzindo o lag de descoberta de dias pra minutos.
 *
 * Google não suporta IndexNow oficialmente, mas Bing → IndexNow → indireta
 * via referrer ajuda. Bing e Yandex re-crawleiam quase em tempo real.
 *
 * Como funciona o protocolo:
 *   POST https://api.indexnow.org/indexnow
 *   Body: { host, key, keyLocation, urlList: [...] }
 *   Resposta esperada: 200 OK
 *
 * Verificação de propriedade do domínio:
 *   O motor de busca acessa https://electiolab.com/{key}.txt e exige que o
 *   conteúdo seja exatamente {key}. Servido por src/app/[key]/route.ts.
 */

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const HOST = "electiolab.com";

// Chave compartilhada com o site. Pública por design — só prova que quem
// está pinjando controla o domínio (cross-verification via /key.txt).
// Trocar essa key requer atualizar src/app/[key]/route.ts em sincronia.
export const INDEXNOW_KEY = "3a301f1241cb4bb48a0493cdbf3f87b0";

const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

export type IndexNowResult = {
  ok: boolean;
  status: number;
  urls_sent: number;
  message?: string;
};

/**
 * Envia uma ou mais URLs pro IndexNow. Limite oficial é 10.000 URLs por
 * request; mantemos batches de 100 pra evitar payload muito grande.
 *
 * Não throwa em caso de erro de rede — retorna { ok: false } pra o caller
 * decidir se loga ou ignora. Ingestão de poll não deve quebrar se Bing
 * estiver fora do ar.
 */
export async function pingIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (urls.length === 0) {
    return { ok: true, status: 200, urls_sent: 0, message: "no urls" };
  }

  // Normaliza: garante que são URLs absolutas do nosso domínio
  const normalized = urls
    .map((u) => {
      if (u.startsWith("http")) return u;
      if (u.startsWith("/")) return `https://${HOST}${u}`;
      return `https://${HOST}/${u}`;
    })
    .filter((u) => u.includes(HOST));

  if (normalized.length === 0) {
    return { ok: false, status: 0, urls_sent: 0, message: "no valid urls after filter" };
  }

  // Dedupe
  const unique = Array.from(new Set(normalized));

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: KEY_LOCATION,
        urlList: unique,
      }),
    });

    return {
      ok: res.ok,
      status: res.status,
      urls_sent: unique.length,
      message: res.ok ? "ok" : `http ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      urls_sent: 0,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
