import type { Metadata } from "next";

// /auth/login é Client Component ("use client") e não pode exportar metadata.
// Este layout server-side aplica noindex: a página de login não deve ser
// indexada nem herdar o canonical da home (root layout). follow:false porque
// não há link de valor a seguir a partir do login.
export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
