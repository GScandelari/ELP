"use client";

import { useState } from "react";
import type { RosterEntry } from "@/lib/classes";
import { removeStudentFromClass } from "@/lib/classes";
import { Button } from "@/components/ui/button";

const ENROLLMENT_TYPE_LABEL: Record<RosterEntry["enrollmentType"], string> = {
  SELF_ENROLLMENT: "Entrou por código",
  TEACHER_ASSIGNED: "Adicionado pelo professor",
};

export function StudentRoster({
  classId,
  roster,
}: {
  classId: string;
  roster: RosterEntry[];
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (roster.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        Nenhum aluno inscrito ainda.
      </p>
    );
  }

  async function onRemove(studentId: string, studentName: string) {
    if (!confirm(`Remover ${studentName || "este aluno"} desta sala?`)) return;
    setRemovingId(studentId);
    try {
      await removeStudentFromClass(classId, studentId);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <ul className="mt-3 divide-y divide-border">
      {roster.map((student) => (
        <li
          key={student.studentId}
          className="flex items-center justify-between gap-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {student.studentName || student.studentEmail}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {student.studentEmail} ·{" "}
              {ENROLLMENT_TYPE_LABEL[student.enrollmentType]}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={removingId === student.studentId}
            onClick={() => onRemove(student.studentId, student.studentName)}
          >
            {removingId === student.studentId ? "Removendo…" : "Remover"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
