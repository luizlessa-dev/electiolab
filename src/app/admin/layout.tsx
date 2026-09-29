import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "/admin";
    redirect(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }

  // Verificar se usuário é admin
  const isAdmin = user.user_metadata?.role === "admin";
  if (!isAdmin) {
    redirect("/");
  }

  return children;
}
