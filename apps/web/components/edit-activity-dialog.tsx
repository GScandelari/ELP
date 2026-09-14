"use client";

import { ActivityFormDialog } from "@/components/activity-form-dialog";
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
  return (
    <ActivityFormDialog
      open={open}
      onClose={onClose}
      idPrefix="edit-activity"
      title="Editar atividade"
      initialTitle={activity.title}
      initialDescription={activity.description}
      initialDifficulty={activity.difficulty}
      initialTagsInput={activity.tags.join(", ")}
      submitLabel="Salvar"
      submitBusyLabel="Salvando…"
      mapError={activityErrorMessage}
      onSubmit={(values) => updateActivityMeta(activityId, values)}
    />
  );
}
