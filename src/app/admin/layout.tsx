import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logAuthFailure } from "@/lib/auth-failure-logger";

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
    // Log unauthenticated access attempt
    await logAuthFailure({
      endpoint: "/admin",
      method: "GET",
      status_code: 401,
      error_message: "Unauthenticated access attempt",
    });

    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "/admin";
    redirect(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }

  // Verificar se usuário é admin
  const isAdmin = user.user_metadata?.role === "admin";
  if (!isAdmin) {
    // Log unauthorized (non-admin) access attempt
    await logAuthFailure({
      endpoint: "/admin",
      method: "GET",
      status_code: 403,
      error_message: "Unauthorized: non-admin user access attempt",
      user_id: user.id,
    });

    redirect("/");
  }

  return children;
}
