import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "../planos-trechos/is-admin";

// admin/api-usage e admin/custom-quotas são client components sem checagem
// própria; este layout é o único gate de UI delas. Os dados continuam
// protegidos por RLS e por /api/admin/custom-quotas, mas a tela não deve
// ser visível a quem não é admin. Mesmo critério de drafts/planos-*.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/dashboard");
  if (!isAdmin(user.email)) redirect("/dashboard");

  return children;
}
