"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ActivityMetaFields } from "@/components/activity-meta-fields";
import {
  activityErrorMessage,
  updateActivityMeta,
  type ActivitySummary,
} from "@/lib/activities";

export function EditActivityDialog({
  activityId,
  activity,
  open,
  onClose,
}: {
  activityId: string;
  activity: ActivitySummary;
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description);
  const [difficulty, setDifficulty] = useState(activity.difficulty);
  const [tagsInput, setTagsInput] = useState(activity.tags.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await updateActivityMeta(activityId, {
        title,
        description,
        difficulty,
        tags,
      });
      onClose();
    } catch (err) {
      setError(activityErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy="edit-activity-heading">
      <h2 id="edit-activity-heading" className="text-lg font-bold">
        Editar atividade
      </h2>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <ActivityMetaFields
          idPrefix="edit-activity"
          title={title}
          description={description}
          difficulty={difficulty}
          tagsInput={tagsInput}
          onTitleChange={setTitle}
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
            {busy ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
