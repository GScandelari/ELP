"use client";

import Link from "next/link";
import { RequireRole } from "@/components/require-role";
import { JoinClassForm } from "@/components/join-class-form";

export default function EntrarSalaPage() {
  return (
    <RequireRole role="student">
      <Link href="/salas" className="text-sm text-muted-foreground underline">
        ← Minhas salas
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Entrar em uma sala</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Peça o código de inscrição ao seu professor.
      </p>
      <JoinClassForm />
    </RequireRole>
  );
}
