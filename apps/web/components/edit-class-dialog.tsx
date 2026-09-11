"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { updateClass, type ClassSummary } from "@/lib/classes";

export function EditClassDialog({
  classId,
  klass,
  open,
  onClose,
}: {
  classId: string;
  klass: ClassSummary;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(klass.name);
  const [description, setDescription] = useState(klass.description);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await updateClass(classId, { name, description });
      onClose();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

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
        aria-labelledby="edit-class-title"
        className="relative w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg"
      >
        <h2 id="edit-class-title" className="text-lg font-bold">
          Editar sala
        </h2>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="edit-class-name"
              className="block text-sm font-medium"
            >
              Nome
            </label>
            <input
              id="edit-class-name"
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
              htmlFor="edit-class-description"
              className="block text-sm font-medium"
            >
              Descrição (opcional)
            </label>
            <textarea
              id="edit-class-description"
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
              {busy ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
