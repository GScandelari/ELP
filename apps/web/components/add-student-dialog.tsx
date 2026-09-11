"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { addStudentErrorMessage, addStudentToClass } from "@/lib/classes";

export function AddStudentDialog({
  classId,
  open,
  onClose,
  onAdded,
}: {
  classId: string;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await addStudentToClass(classId, email);
      setEmail("");
      onAdded();
    } catch (err) {
      setError(addStudentErrorMessage(err));
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
        aria-labelledby="add-student-title"
        className="relative w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg"
      >
        <h2 id="add-student-title" className="text-lg font-bold">
          Adicionar aluno
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Funciona para alunos que já têm conta na ELP. Cadastro de aluno sem
          conta (incluindo menores de idade) chega numa próxima atualização.
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="student-email"
              className="block text-sm font-medium"
            >
              E-mail do aluno
            </label>
            <input
              id="student-email"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
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
              {busy ? "Adicionando…" : "Adicionar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
