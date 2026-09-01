import { revalidatePath } from "next/cache";

/**
 * Páginas agregadoras que mudam quando entra pesquisa nova. Ficavam declaradas
 * dentro de /api/revalidate; foram extraídas para cá porque o cron de ingestão
 * precisa da mesma lista — antes o webhook existia mas nada o chamava, então na
 * prática o frescor dependia só do TTL do ISR.
 */
export const ALL_PATHS = [
  "/",
  "/sobre",
  "/imprensa",
  "/pesquisas-presidenciais-2026",
  "/quem-vence-no-segundo-turno-presidencia-2026",
  "/instituto-mais-acurado-eleicoes-brasil",
  "/quanto-custa-campanha-eleitoral-google-ads-meta",
  "/relatorio/semana-17-2026",
  "/patrimonio",
  "/fefc",
  "/redes-sociais",
  "/institutos",
  "/candidatos",
  "/eleicao-2018",
  "/eleicao-2022",
  // Pages dinâmicas governador (27 UFs)
  ...["ac","al","am","ap","ba","ce","df","es","go","ma","mg","ms","mt","pa","pb","pe","pi","pr","rj","rn","ro","rr","rs","sc","se","sp","to"]
    .map((uf) => `/eleicoes-governador-${uf}-2026`),
];

/**
 * Revalida as agregadoras. Chamada in-process pelo cron (sem HTTP, sem token):
 * o cron roda dentro do mesmo app, então bater no próprio endpoint só
 * adicionaria uma invocação de function e uma dependência de env.
 *
 * O sitemap entra junto porque o `lastModified` das agregadoras deriva da
 * última pesquisa publicada.
 */
export function revalidarAgregadoras(): string[] {
  const paths = [...ALL_PATHS, "/sitemap.xml"];
  for (const p of paths) revalidatePath(p);
  return paths;
}
