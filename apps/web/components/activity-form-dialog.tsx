"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ActivityMetaFields } from "@/components/activity-meta-fields";
import type { ActivityDifficulty } from "@/lib/activities";

export type ActivityFormValues = {
  title: string;
  description: string;
  difficulty: ActivityDifficulty;
  tags: string[];
};

/**
 * Dialog de formulário título+descrição+dificuldade+tags da atividade,
 * usado tanto para criar quanto para editar (mesmo padrão de
 * ClassFormDialog na Fase 2). `extraFields` é onde entra o seletor de
 * tipo — só existe em "criar", nunca em "editar" (o tipo não muda depois
 * que a atividade já tem itens de um formato específico).
 */
export function ActivityFormDialog({
  open,
  onClose,
  idPrefix,
  title,
  initialTitle = "",
  initialDescription = "",
  initialDifficulty = "EASY",
  initialTagsInput = "",
  extraFields,
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
  initialTitle?: string;
  initialDescription?: string;
  initialDifficulty?: ActivityDifficulty;
  initialTagsInput?: string;
  extraFields?: ReactNode;
  submitLabel: string;
  submitBusyLabel: string;
  onSubmit: (values: ActivityFormValues) => Promise<void>;
  mapError: (err: unknown) => string;
  /** Volta os campos aos valores iniciais depois de salvar (uso: criar). */
  resetOnSuccess?: boolean;
}) {
  const [activityTitle, setActivityTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [tagsInput, setTagsInput] = useState(initialTagsInput);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headingId = `${idPrefix}-heading`;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await onSubmit({ title: activityTitle, description, difficulty, tags });
      if (resetOnSuccess) {
        setActivityTitle(initialTitle);
        setDescription(initialDescription);
        setDifficulty(initialDifficulty);
        setTagsInput(initialTagsInput);
      }
      onClose();
    } catch (err) {
      setError(mapError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy={headingId}>
      <h2 id={headingId} className="text-lg font-bold">
        {title}
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {extraFields}
        <ActivityMetaFields
          idPrefix={idPrefix}
          title={activityTitle}
          description={description}
          difficulty={difficulty}
          tagsInput={tagsInput}
          onTitleChange={setActivityTitle}
          onDescriptionChange={setDescription}
          onDifficultyChange={setDifficulty}
          onTagsInputChange={setTagsInput}
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
