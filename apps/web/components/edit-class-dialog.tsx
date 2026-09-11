"use client";

import { ClassFormDialog } from "@/components/class-form-dialog";
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
  return (
    <ClassFormDialog
      open={open}
      onClose={onClose}
      idPrefix="edit-class"
      title="Editar sala"
      initialName={klass.name}
      initialDescription={klass.description}
      submitLabel="Salvar"
      submitBusyLabel="Salvando…"
      mapError={() => "Não foi possível salvar. Tente novamente."}
      onSubmit={async (name, description) => {
        await updateClass(classId, { name, description });
      }}
    />
  );
}
