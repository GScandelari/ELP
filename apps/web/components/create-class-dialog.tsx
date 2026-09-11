"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { createClass, createClassErrorMessage } from "@/lib/classes";

export function CreateClassDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (classId: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { classId } = await createClass({
        name,
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      onCreated(classId);
    } catch (err) {
      setError(createClassErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* fundo clicável para fechar — <button>, não <div>, para ter foco e
          teclado (Enter/Espaço) de graça, sem violar a11y (S1082) */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-class-title"
        className="relative w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg"
      >
        <h2 id="create-class-title" className="text-lg font-bold">
          Criar sala
        </h2>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="class-name" className="block text-sm font-medium">
              Nome
            </label>
            <input
              id="class-name"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="class-description"
              className="block text-sm font-medium"
            >
              Descrição (opcional)
            </label>
            <textarea
              id="class-description"
              maxLength={500}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Criando…" : "Criar sala"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
