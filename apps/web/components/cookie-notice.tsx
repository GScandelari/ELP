"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "elp.cookieNotice.dismissed";

// Aviso informativo — no MVP a ELP usa apenas cookies estritamente
// necessários (ADR-011). Não há opt-in porque não há rastreamento.
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 backdrop-blur"
    >
      <div className="container flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Usamos apenas cookies essenciais para manter você conectado e proteger
          o acesso. Não usamos cookies de publicidade nem de medição de
          audiência.{" "}
          <Link href="/cookies" className="underline">
            Saiba mais
          </Link>
          .
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
