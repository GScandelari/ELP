"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { Dialog } from "@/components/ui/dialog";
import { DialogFormFooter } from "@/components/ui/dialog-form-footer";
import { watchTeacherClasses, type ClassSummary } from "@/lib/classes";
import {
  publishAssignment,
  publishAssignmentErrorMessage,
} from "@/lib/assignments";

/**
 * Atribui uma atividade `READY` a uma ou mais salas de uma vez (RF-011,
 * RN-012). Uma chamada de `publishAssignment` por sala marcada — não é
 * atômico entre salas (cada uma vira um assignment independente), mas
 * cada chamada individual é.
 */
export function PublishAssignmentDialog({
  activityId,
  open,
  onClose,
}: {
  activityId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassSummary[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [allowRetry, setAllowRetry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    return watchTeacherClasses(user.uid, setClasses);
  }, [open, user]);

  function toggle(classId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  }

  function reset() {
    setSelected(new Set());
    setDueDate("");
    setMaxAttempts(1);
    setAllowRetry(false);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (selected.size === 0) {
      setError("Selecione ao menos uma sala.");
      return;
    }
    setBusy(true);
    try {
      await Promise.all(
        [...selected].map((classId) =>
          publishAssignment({
            classId,
            activityId,
            dueDate: dueDate || undefined,
            maxAttempts,
            allowRetry,
          }),
        ),
      );
      reset();
      onClose();
    } catch (err) {
      setError(publishAssignmentErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // sala arquivada não recebe novas atribuições
  const eligibleClasses = (classes ?? []).filter(
    (c) => c.status !== "ARCHIVED",
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      labelledBy="publish-assignment-heading"
    >
      <h2 id="publish-assignment-heading" className="text-lg font-bold">
        Atribuir a sala(s)
      </h2>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <fieldset>
          <legend className="text-sm font-medium">Salas</legend>
          {classes === null && (
            <p className="mt-2 text-sm text-muted-foreground">Carregando…</p>
          )}
          {classes !== null && eligibleClasses.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Você ainda não tem nenhuma sala.
            </p>
          )}
          <div className="mt-2 space-y-2">
            {eligibleClasses.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="assignment-due-date"
            className="block text-sm font-medium"
          >
            Data limite (opcional)
          </label>
          <input
            id="assignment-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="assignment-max-attempts"
            className="block text-sm font-medium"
          >
            Máximo de tentativas
          </label>
          <input
            id="assignment-max-attempts"
            type="number"
            min={1}
            required
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(Number(e.target.value) || 1)}
            className="mt-1 h-10 w-24 rounded-md border border-border bg-background px-3 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowRetry}
            onChange={(e) => setAllowRetry(e.target.checked)}
          />
          Permitir nova tentativa
        </label>

        <DialogFormFooter
          error={error}
          busy={busy}
          onCancel={handleClose}
          submitLabel="Atribuir"
          busyLabel="Atribuindo…"
        />
      </form>
    </Dialog>
  );
}
