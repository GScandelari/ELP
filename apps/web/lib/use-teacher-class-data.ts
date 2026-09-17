"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  watchClass,
  watchRoster,
  type ClassSummary,
  type RosterEntry,
} from "@/lib/classes";
import { watchClassAssignments, type AssignmentSummary } from "@/lib/assignments";

/**
 * Observa sala + roster + atividades atribuídas — a base de dados que
 * a tela da sala (`TeacherClassDetail`) e o dashboard de resultados
 * (`/salas/[classId]/resultados`, Fase 5) compartilham.
 */
export function useTeacherClassData(classId: string) {
  const { user } = useAuth();
  const [klass, setKlass] = useState<ClassSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);

  useEffect(
    () =>
      watchClass(classId, (c) => {
        setKlass(c);
        setLoaded(true);
      }),
    [classId],
  );

  useEffect(() => {
    if (!user) return;
    return watchRoster(classId, user.uid, setRoster);
  }, [classId, user]);

  useEffect(() => {
    if (!user) return;
    return watchClassAssignments(classId, user.uid, setAssignments);
  }, [classId, user]);

  return { klass, loaded, roster, assignments };
}
