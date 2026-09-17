"use client";

import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";

export type AssignmentScore = {
  score: number;
  maxScore: number;
};

export type ResultsSummaryEntry = {
  studentId: string;
  /** assignmentId -> nota (melhor tentativa, docs/plano-fase-5.md §8 decisão 1). */
  assignmentScores: Record<string, AssignmentScore>;
};

function mapResultsSummary(
  id: string,
  data: DocumentData | undefined,
): ResultsSummaryEntry | null {
  if (!data) return null;
  return {
    studentId: id,
    assignmentScores: data.assignmentScores ?? {},
  };
}

/**
 * Observa os resumos de resultados de uma sala (RF-018/UC-007, Fase 5)
 * — um documento por aluno, mantido pela Cloud Function de agregação a
 * cada tentativa corrigida, sem depender de `resultsReleased` (RN-010:
 * o professor sempre vê a nota real). `accountId` no filtro é o que
 * prova a regra de `list` (mesma lição de `watchRoster`/`watchClassAssignments`
 * — docs/plano-fase-5.md §2).
 */
export function watchResultsSummary(
  classId: string,
  teacherUid: string,
  onChange: (entries: ResultsSummaryEntry[]) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collection(db, "classes", classId, "resultsSummary"),
    where("accountId", "==", teacherUid),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs
          .map((d) => mapResultsSummary(d.id, d.data()))
          .filter((e): e is ResultsSummaryEntry => e !== null),
      );
    },
    () => onChange([]),
  );
}
