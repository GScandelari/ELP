"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ClassNameDescriptionFields } from "@/components/class-name-description-fields";
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
    <Dialog open={open} onClose={onClose} labelledBy="edit-class-title">
      <h2 id="edit-class-title" className="text-lg font-bold">
        Editar sala
      </h2>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <ClassNameDescriptionFields
          idPrefix="edit-class"
          name={name}
          description={description}
          onNameChange={setName}
          onDescriptionChange={setDescription}
        />

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
    </Dialog>
  );
}
