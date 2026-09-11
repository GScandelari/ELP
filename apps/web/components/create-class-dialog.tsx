"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ClassNameDescriptionFields } from "@/components/class-name-description-fields";
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
    <Dialog open={open} onClose={onClose} labelledBy="create-class-title">
      <h2 id="create-class-title" className="text-lg font-bold">
        Criar sala
      </h2>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <ClassNameDescriptionFields
          idPrefix="class"
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
            {busy ? "Criando…" : "Criar sala"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
