"use client";

import { ClassFormDialog } from "@/components/class-form-dialog";
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
  return (
    <ClassFormDialog
      open={open}
      onClose={onClose}
      idPrefix="class"
      title="Criar sala"
      submitLabel="Criar sala"
      submitBusyLabel="Criando…"
      resetOnSuccess
      mapError={createClassErrorMessage}
      onSubmit={async (name, description) => {
        const { classId } = await createClass({
          name,
          description: description.trim() || undefined,
        });
        onCreated(classId);
      }}
    />
  );
}
