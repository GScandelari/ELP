import Link from "next/link";
import { ACTIVITY_TYPE_LABEL } from "@/lib/activities";
import type { AssignmentSummary } from "@/lib/assignments";

const STATUS_LABEL: Record<AssignmentSummary["status"], string> = {
  PUBLISHED: "Disponível",
  CLOSED: "Encerrada",
};

/** Lista de atividades atribuídas à sala, do lado do aluno (RF-012, UC-006 passo 2). */
export function StudentAssignmentList({
  classId,
  assignments,
}: {
  classId: string;
  assignments: AssignmentSummary[];
}) {
  if (assignments.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Nenhuma atividade disponível ainda.
      </p>
    );
  }

  return (
    <ul aria-label="Atividades da sala" className="mt-3 space-y-2">
      {assignments.map((assignment) => (
        <li key={assignment.id}>
          <Link
            href={`/salas/${classId}/atividades/${assignment.id}`}
            className="block rounded-md border border-border p-3 transition-colors hover:bg-muted"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="font-medium">{assignment.activityTitle}</p>
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {STATUS_LABEL[assignment.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {ACTIVITY_TYPE_LABEL[assignment.type]}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
