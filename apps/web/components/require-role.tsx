"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth, type Role } from "@/lib/auth";

/**
 * Guarda client-side para rotas restritas a um papel (ex.: detalhe da sala,
 * só o professor dono). Assume que já está dentro de <RequireAuth>.
 */
export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { role: current, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && current !== role) router.replace("/painel");
  }, [loading, current, role, router]);

  if (loading || current !== role) return null;
  return <>{children}</>;
}
