"use client";

import { useState } from "react";
import {
  ActivityFormDialog,
  type ActivityFormValues,
} from "@/components/activity-form-dialog";
import {
  activityErrorMessage,
  createActivity,
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
  const [type, setType] = useState<ActivityType>("MULTIPLE_CHOICE");

  async function onSubmit({
    title,
    description,
    difficulty,
    tags,
  }: ActivityFormValues) {
    const activityId = await createActivity(uid, {
      title,
      description,
      type,
      difficulty,
      tags,
    });
    onCreated(activityId);
  }

  return (
    <ActivityFormDialog
      open={open}
      onClose={onClose}
      idPrefix="activity"
      title="Nova atividade"
      submitLabel="Criar atividade"
      submitBusyLabel="Criando…"
      resetOnSuccess
      mapError={activityErrorMessage}
      onSubmit={onSubmit}
      extraFields={
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
      }
    />
  );
}
