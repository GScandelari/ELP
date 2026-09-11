"use client";

import { useState } from "react";
import { formatCode } from "@/lib/enrollment-code";
import { Button } from "@/components/ui/button";

/** Mostra o código de inscrição formatado com um botão de copiar. */
export function EnrollmentCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(formatCode(code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível (ex.: contexto não seguro) — sem tratamento especial
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-md border border-border bg-muted px-3 py-1.5 font-mono text-lg tracking-wider">
        {formatCode(code)}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={onCopy}>
        {copied ? "Copiado!" : "Copiar"}
      </Button>
    </div>
  );
}
