// Compartilhado entre page.tsx e actions.ts nesta feature — mesmo critério
// já usado em dashboard/drafts/page.tsx (allowlist de e-mail via env var,
// não há tabela de role/admin no banco).
export function isAdmin(email: string | undefined): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return list.length > 0 && !!email && list.includes(email);
}
