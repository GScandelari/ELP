import type { RosterEntry } from "@/lib/classes";
import type { AssignmentSummary } from "@/lib/assignments";
import type { ResultsSummaryEntry } from "@/lib/results";

/**
 * Tabela aluno × atividade (RF-018/UC-007, Fase 5, decisão §8.2 do
 * plano) — cobre as 3 dimensões do RF-018 numa tela só: "sala" é a
 * página inteira, "aluno" é cada linha, "atividade" é cada coluna.
 */
export function ResultsTable({
  roster,
  assignments,
  results,
}: {
  roster: RosterEntry[];
  assignments: AssignmentSummary[];
  results: ResultsSummaryEntry[];
}) {
  if (roster.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum aluno inscrito ainda.
      </p>
    );
  }
  if (assignments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma atividade atribuída ainda.
      </p>
    );
  }

  const scoresByStudent = new Map(
    results.map((r) => [r.studentId, r.assignmentScores]),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="p-2 font-medium">Aluno</th>
            {assignments.map((assignment) => (
              <th key={assignment.id} className="p-2 font-medium">
                {assignment.activityTitle}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roster.map((student) => {
            const scores = scoresByStudent.get(student.studentId) ?? {};
            return (
              <tr key={student.studentId} className="border-b border-border">
                <td className="p-2">{student.studentName}</td>
                {assignments.map((assignment) => {
                  const score = scores[assignment.id];
                  return (
                    <td key={assignment.id} className="p-2">
                      {score ? `${score.score} / ${score.maxScore}` : "—"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
