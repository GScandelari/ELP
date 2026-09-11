"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { buttonClassName } from "@/components/ui/button";

export default function PainelPage() {
  const { user, role } = useAuth();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Painel</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Área autenticada — o restante do portal do professor e do aluno vem nas
        próximas fases.
      </p>

      {(role === "teacher" || role === "student") && (
        <Link href="/salas" className={buttonClassName({ className: "mt-4" })}>
          Minhas salas
        </Link>
      )}

      <dl className="mt-6 space-y-1 text-sm">
        <div>
          <dt className="inline font-medium">E-mail: </dt>
          <dd className="inline">{user?.email}</dd>
        </div>
        <div>
          <dt className="inline font-medium">UID: </dt>
          <dd className="inline font-mono text-xs">{user?.uid}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Papel: </dt>
          <dd className="inline" data-testid="painel-role">
            {role ?? "não definido"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
