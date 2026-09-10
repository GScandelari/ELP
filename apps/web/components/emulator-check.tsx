"use client";

import { useEffect, useState } from "react";
import { getFirebase } from "@/lib/firebase";

type State = "idle" | "checking" | "ok" | "down";

// Critério de saída da Fase 0: o Next.js conversa com o emulador de Auth.
// Só aparece quando NEXT_PUBLIC_USE_EMULATORS=true.
export function EmulatorCheck() {
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_EMULATORS !== "true") return;
    setState("checking");
    // inicializa o SDK apontando para os emuladores
    getFirebase();
    fetch("http://127.0.0.1:9099/")
      .then((r) => setState(r.ok ? "ok" : "down"))
      .catch(() => setState("down"));
  }, []);

  if (process.env.NEXT_PUBLIC_USE_EMULATORS !== "true") return null;

  const label =
    state === "ok"
      ? "conectado ✓"
      : state === "down"
        ? "offline ✗ (rode: pnpm emulators)"
        : "verificando…";

  return (
    <p className="mt-8 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      Emulador de Auth (127.0.0.1:9099): <strong>{label}</strong>
    </p>
  );
}
