"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AssignmentContentPreview } from "@/components/assignment-content-preview";
import { ACTIVITY_TYPE_LABEL } from "@/lib/activities";
import {
  closeAssignment,
  releaseAssignmentResults,
  releaseAssignmentResultsErrorMessage,
  type AssignmentSummary,
} from "@/lib/assignments";

const STATUS_LABEL: Record<AssignmentSummary["status"], string> = {
  PUBLISHED: "Publicada",
  CLOSED: "Encerrada",
};

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "Sem prazo";
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return "Sem prazo";
  return `até ${date.toLocaleDateString("pt-BR")}`;
}

/** Lista os assignments de uma sala (RF-011), com ação de encerrar. */
export function AssignmentList({
  classId,
  assignments,
}: {
  classId: string;
  assignments: AssignmentSummary[];
}) {
  if (assignments.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Nenhuma atividade atribuída ainda.
      </p>
    );
  }

  return (
    <ul aria-label="Atividades atribuídas" className="mt-3 space-y-3">
      {assignments.map((assignment) => (
        <AssignmentListItem
          key={assignment.id}
          classId={classId}
          assignment={assignment}
        />
      ))}
    </ul>
  );
}

function AssignmentListItem({
  classId,
  assignment,
}: {
  classId: string;
  assignment: AssignmentSummary;
}) {
  const [showContent, setShowContent] = useState(false);
  const [closing, setClosing] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  async function handleClose() {
    if (!confirm("Encerrar esta atribuição? Não será possível reabrir.")) {
      return;
    }
    setClosing(true);
    try {
      await closeAssignment(classId, assignment.id, assignment.resultsPolicy);
    } finally {
      setClosing(false);
    }
  }

  async function handleRelease() {
    setReleaseError(null);
    setReleasing(true);
    try {
      await releaseAssignmentResults(classId, assignment.id);
    } catch (err) {
      setReleaseError(releaseAssignmentResultsErrorMessage(err));
    } finally {
      setReleasing(false);
    }
  }

  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{assignment.activityTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ACTIVITY_TYPE_LABEL[assignment.type]} ·{" "}
            {formatDueDate(assignment.dueDate)} · {assignment.maxAttempts}{" "}
            {assignment.maxAttempts === 1 ? "tentativa" : "tentativas"}
            {assignment.allowRetry ? " (com nova tentativa)" : ""}
            {assignment.resultsReleased ? " · resultados liberados" : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {STATUS_LABEL[assignment.status]}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowContent((v) => !v)}
        >
          {showContent ? "Ocultar" : "Mostrar"} conteúdo
        </Button>
        {assignment.status === "PUBLISHED" && (
          <Button
            size="sm"
            variant="outline"
            disabled={closing}
            onClick={handleClose}
          >
            {closing ? "Encerrando…" : "Encerrar"}
          </Button>
        )}
        {!assignment.resultsReleased && (
          <Button
            size="sm"
            variant="outline"
            disabled={releasing}
            onClick={handleRelease}
          >
            {releasing ? "Liberando…" : "Liberar resultados"}
          </Button>
        )}
      </div>

      {releaseError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {releaseError}
        </p>
      )}

      {showContent && (
        <div className="mt-3">
          <AssignmentContentPreview
            type={assignment.type}
            contentSnapshot={assignment.contentSnapshot}
          />
        </div>
      )}
    </li>
  );
}
