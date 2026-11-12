/**
 * Papel de admin do ElectioLab.
 *
 * Fonte: `app_metadata.is_admin === true`. `app_metadata` só pode ser alterado
 * com service_role (painel do Supabase ou Admin API). `user_metadata` NÃO serve:
 * o próprio usuário altera por `auth.updateUser({ data })`, então qualquer conta
 * logada poderia se declarar `role: "admin"`.
 *
 * Use sempre este helper para checar admin. Não ler `user_metadata` em lugar nenhum.
 */
export type UserWithAppMetadata = {
  app_metadata?: Record<string, unknown> | null;
} | null | undefined;

export function isAdminUser(user: UserWithAppMetadata): boolean {
  return user?.app_metadata?.is_admin === true;
}
