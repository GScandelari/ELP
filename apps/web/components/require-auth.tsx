"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

// Guarda client-side para rotas autenticadas. A verificação server-side
// (session cookie) fica para o hardening da Fase 6, se necessário para SSR.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/entrar");
  }, [loading, user, router]);

  if (loading) {
    return (
      <p className="container py-12 text-sm text-muted-foreground">Carregando…</p>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}
