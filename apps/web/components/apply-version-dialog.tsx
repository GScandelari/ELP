"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { Dialog } from "@/components/ui/dialog";
import { DialogFormFooter } from "@/components/ui/dialog-form-footer";
import {
  swapAssignmentActivity,
  swapAssignmentActivityErrorMessage,
  watchAssignmentRefs,
  type AssignmentRef,
} from "@/lib/assignments";

/**
 * "Aplicar esta versão" (ADR-014 §7): lista as salas onde esta atividade
 * (ou, se for um clone, a atividade de origem) está atribuída, agrupadas
 * por elegibilidade. Salas sem tentativas iniciadas podem ser
 * substituídas pela versão atual; salas com tentativa iniciada ficam
 * travadas — sem ação aqui (a ação composta "encerrar + publicar nova
 * versão" é entrega da PR 3.9, dona de "encerrar assignment").
 */
export function ApplyVersionDialog({
  activityId,
  clonedFrom,
  open,
  onClose,
}: {
  activityId: string;
  clonedFrom: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [ownRefs, setOwnRefs] = useState<AssignmentRef[] | null>(null);
  const [originRefs, setOriginRefs] = useState<AssignmentRef[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    return watchAssignmentRefs(activityId, user.uid, setOwnRefs);
  }, [open, user, activityId]);

  useEffect(() => {
    if (!open || !user || !clonedFrom) {
      setOriginRefs([]);
      return;
    }
    return watchAssignmentRefs(clonedFrom, user.uid, setOriginRefs);
  }, [open, user, clonedFrom]);

  function reset() {
    setSelected(new Set());
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function toggle(classId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  }

  const loaded = ownRefs !== null && originRefs !== null;
  const allRefs = [...(ownRefs ?? []), ...(originRefs ?? [])];
  const eligible = allRefs.filter((r) => r.startedCount === 0);
  const blocked = allRefs.filter((r) => r.startedCount > 0);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (selected.size === 0) {
      setError("Selecione ao menos uma sala.");
      return;
    }
    setBusy(true);
    try {
      const targets = eligible.filter((r) => selected.has(r.classId));
      await Promise.all(
        targets.map((r) =>
          swapAssignmentActivity({
            classId: r.classId,
            assignmentId: r.assignmentId,
            sourceActivityId: activityId,
          }),
        ),
      );
      reset();
      onClose();
    } catch (err) {
      setError(swapAssignmentActivityErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      labelledBy="apply-version-heading"
    >
      <h2 id="apply-version-heading" className="text-lg font-bold">
        Aplicar esta versão
      </h2>

      {!loaded && (
        <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>
      )}

      {loaded && (
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <fieldset>
            <legend className="text-sm font-medium">
              Salas sem tentativas iniciadas
            </legend>
            {eligible.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Nenhuma sala elegível no momento.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {eligible.map((ref) => (
                  <label
                    key={ref.classId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(ref.classId)}
                      onChange={() => toggle(ref.classId)}
                    />
                    {ref.className}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {blocked.length > 0 && (
            <div>
              <h3 className="text-sm font-medium">
                Salas com tentativas iniciadas
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Essas turmas já começaram e continuam na versão que começaram —
                não é possível substituir.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {blocked.map((ref) => (
                  <li key={ref.classId}>{ref.className}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Para atribuir esta atividade a uma sala nova, use &quot;Atribuir a
            sala(s)&quot;.
          </p>

          <DialogFormFooter
            error={error}
            busy={busy}
            onCancel={handleClose}
            submitLabel="Aplicar"
            busyLabel="Aplicando…"
          />
        </form>
      )}
    </Dialog>
  );
}
