"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ActivityMetaFields } from "@/components/activity-meta-fields";
import {
  activityErrorMessage,
  createActivity,
  type ActivityDifficulty,
  type ActivityType,
} from "@/lib/activities";

const TYPE_LABEL: Record<ActivityType, string> = {
  MULTIPLE_CHOICE: "Múltipla escolha",
  FILL_IN_BLANKS: "Preencher espaços",
  TRANSLATION: "Tradução/localização",
  MEANING_MATCHING: "Relacionamento de significados",
};

export function CreateActivityDialog({
  uid,
  open,
  onClose,
  onCreated,
}: {
  uid: string;
  open: boolean;
  onClose: () => void;
  onCreated: (activityId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ActivityType>("MULTIPLE_CHOICE");
  const [difficulty, setDifficulty] = useState<ActivityDifficulty>("EASY");
  const [tagsInput, setTagsInput] = useState("");
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
      const activityId = await createActivity(uid, {
        title,
        description,
        type,
        difficulty,
        tags,
      });
      setTitle("");
      setDescription("");
      setTagsInput("");
      onCreated(activityId);
    } catch (err) {
      setError(activityErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy="create-activity-heading">
      <h2 id="create-activity-heading" className="text-lg font-bold">
        Nova atividade
      </h2>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="activity-type" className="block text-sm font-medium">
            Tipo
          </label>
          <select
            id="activity-type"
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <ActivityMetaFields
          idPrefix="activity"
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
            {busy ? "Criando…" : "Criar atividade"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
