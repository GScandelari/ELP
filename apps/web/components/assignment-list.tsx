"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AssignmentContentPreview } from "@/components/assignment-content-preview";
import type { AssignmentSummary } from "@/lib/assignments";

const TYPE_LABEL: Record<AssignmentSummary["type"], string> = {
  MULTIPLE_CHOICE: "Múltipla escolha",
  FILL_IN_BLANKS: "Preencher espaços",
  TRANSLATION: "Tradução/localização",
  MEANING_MATCHING: "Relacionamento de significados",
};

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

/** Lista os assignments de uma sala (RF-011) — sem ações de encerrar ainda (PR 3.9). */
export function AssignmentList({
  assignments,
}: {
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
        <AssignmentListItem key={assignment.id} assignment={assignment} />
      ))}
    </ul>
  );
}

function AssignmentListItem({ assignment }: { assignment: AssignmentSummary }) {
  const [showContent, setShowContent] = useState(false);

  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{assignment.activityTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {TYPE_LABEL[assignment.type]} · {formatDueDate(assignment.dueDate)}{" "}
            · {assignment.maxAttempts}{" "}
            {assignment.maxAttempts === 1 ? "tentativa" : "tentativas"}
            {assignment.allowRetry ? " (com nova tentativa)" : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {STATUS_LABEL[assignment.status]}
        </span>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="mt-2"
        onClick={() => setShowContent((v) => !v)}
      >
        {showContent ? "Ocultar" : "Mostrar"} conteúdo
      </Button>

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
