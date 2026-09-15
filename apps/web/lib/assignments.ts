"use client";

import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import type { ActivityType } from "@/lib/activities";

export type AssignmentStatus = "PUBLISHED" | "CLOSED";

export type AssignmentContentEntry<TContent = unknown> = {
  itemId: string;
  prompt: string;
  points: number;
  content: TContent;
};

export type AssignmentSummary = {
  id: string;
  activityId: string;
  activityTitle: string;
  type: ActivityType;
  status: AssignmentStatus;
  position: number;
  dueDate: string | null;
  allowRetry: boolean;
  maxAttempts: number;
  startedCount: number;
  resultsReleased: boolean;
  contentSnapshot: AssignmentContentEntry[];
};

function mapAssignment(
  id: string,
  data: DocumentData | undefined,
): AssignmentSummary | null {
  if (!data) return null;
  return {
    id,
    activityId: data.activityId ?? "",
    activityTitle: data.activityTitle ?? "",
    type: data.type,
    status: data.status ?? "PUBLISHED",
    position: data.position ?? 0,
    dueDate: data.dueDate ?? null,
    allowRetry: data.allowRetry ?? false,
    maxAttempts: data.maxAttempts ?? 1,
    startedCount: data.startedCount ?? 0,
    resultsReleased: data.resultsReleased ?? false,
    contentSnapshot: data.contentSnapshot ?? [],
  };
}

/**
 * Observa os assignments de uma sala, em ordem. `where('accountId', ...)`
 * é o que prova a regra de `list` pro professor (docs/plano-fase-3.md §2/§6).
 */
export function watchClassAssignments(
  classId: string,
  uid: string,
  onChange: (assignments: AssignmentSummary[]) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collection(db, "classes", classId, "assignments"),
    where("accountId", "==", uid),
    orderBy("position", "asc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs
          .map((d) => mapAssignment(d.id, d.data()))
          .filter((a): a is AssignmentSummary => a !== null),
      );
    },
    () => onChange([]),
  );
}

export type PublishAssignmentInput = {
  classId: string;
  activityId: string;
  dueDate?: string;
  maxAttempts?: number;
  allowRetry?: boolean;
};

export type PublishAssignmentResult = { assignmentId: string };

/** Atribui uma atividade `READY` a uma sala, via callable `publishAssignment` (RF-011). */
export async function publishAssignment(
  input: PublishAssignmentInput,
): Promise<PublishAssignmentResult> {
  const { functions } = getFirebase();
  const fn = httpsCallable<PublishAssignmentInput, PublishAssignmentResult>(
    functions,
    "publishAssignment",
  );
  const res = await fn(input);
  return res.data;
}

export function publishAssignmentErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "functions/failed-precondition":
        return (
          err.message ||
          "Esta atividade não pode ser atribuída no estado atual."
        );
      case "functions/invalid-argument":
        return err.message || "Confira os dados da atribuição.";
      case "functions/permission-denied":
        return "Apenas professores podem atribuir atividades.";
      case "functions/not-found":
        return "Sala ou atividade não encontrada.";
      default:
        return "Não foi possível atribuir a atividade. Tente novamente.";
    }
  }
  return "Não foi possível atribuir a atividade. Tente novamente.";
}
