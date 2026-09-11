"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ClassNameDescriptionFields } from "@/components/class-name-description-fields";

/**
 * Dialog de formulário nome+descrição da sala, usado tanto para criar
 * quanto para editar — só muda o que `onSubmit` faz com os valores.
 */
export function ClassFormDialog({
  open,
  onClose,
  idPrefix,
  title,
  initialName = "",
  initialDescription = "",
  submitLabel,
  submitBusyLabel,
  onSubmit,
  mapError,
  resetOnSuccess = false,
}: {
  open: boolean;
  onClose: () => void;
  idPrefix: string;
  title: string;
  initialName?: string;
  initialDescription?: string;
  submitLabel: string;
  submitBusyLabel: string;
  onSubmit: (name: string, description: string) => Promise<void>;
  mapError: (err: unknown) => string;
  /** Volta os campos para os valores iniciais depois de salvar (uso: criar, para deixar pronto para a próxima). */
  resetOnSuccess?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const titleId = `${idPrefix}-title`;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(name, description);
      if (resetOnSuccess) {
        setName(initialName);
        setDescription(initialDescription);
      }
      onClose();
    } catch (err) {
      setError(mapError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId} className="text-lg font-bold">
        {title}
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <ClassNameDescriptionFields
          idPrefix={idPrefix}
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
            {busy ? submitBusyLabel : submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
