"use client";

import type { ReactNode } from "react";

/**
 * Casca comum de modal: fundo cobrindo a tela + painel central. O fundo é
 * um <button>, não um <div onClick>, para ter foco e teclado (Enter/Espaço)
 * de graça sem violar a11y (regra S1082 do SonarCloud).
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** id do elemento (geralmente um <h2>) que nomeia o dialog para leitores de tela. */
  labelledBy: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg"
      >
        {children}
      </div>
    </div>
  );
}
