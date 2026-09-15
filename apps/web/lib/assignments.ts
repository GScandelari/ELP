"use client";

import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
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

/**
 * Encerra um assignment `PUBLISHED` (RF-011) — escrita direta, a rule já
 * permite ao dono da sala mudar `status` mantendo `accountId`/`activityId`/
 * `contentSnapshot` (docs/plano-fase-3.md §6). Sem volta: RF-011 descreve
 * só o sentido PUBLISHED → CLOSED, sem reabertura.
 */
export async function closeAssignment(
  classId: string,
  assignmentId: string,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, "classes", classId, "assignments", assignmentId), {
    status: "CLOSED",
    updatedAt: serverTimestamp(),
  });
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

export type AssignmentRef = {
  classId: string;
  className: string;
  assignmentId: string;
  status: AssignmentStatus;
  startedCount: number;
};

function mapAssignmentRef(data: DocumentData | undefined): AssignmentRef | null {
  if (!data) return null;
  return {
    classId: data.classId ?? "",
    className: data.className ?? "",
    assignmentId: data.assignmentId ?? "",
    status: data.status ?? "PUBLISHED",
    startedCount: data.startedCount ?? 0,
  };
}

/**
 * Observa em quais salas uma atividade está atribuída (índice reverso
 * mantido por `publishAssignment`/`swapAssignmentActivity` — ADR-014 §7,
 * tela "Aplicar esta versão").
 */
export function watchAssignmentRefs(
  activityId: string,
  uid: string,
  onChange: (refs: AssignmentRef[]) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collection(db, "activities", activityId, "assignmentRefs"),
    where("accountId", "==", uid),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs
          .map((d) => mapAssignmentRef(d.data()))
          .filter((r): r is AssignmentRef => r !== null),
      );
    },
    () => onChange([]),
  );
}

export type SwapAssignmentActivityInput = {
  classId: string;
  assignmentId: string;
  sourceActivityId: string;
};

/**
 * Substitui a atividade de origem de um assignment sem tentativas
 * iniciadas, via callable `swapAssignmentActivity` (ADR-014 §4/§7).
 */
export async function swapAssignmentActivity(
  input: SwapAssignmentActivityInput,
): Promise<{ ok: boolean }> {
  const { functions } = getFirebase();
  const fn = httpsCallable<SwapAssignmentActivityInput, { ok: boolean }>(
    functions,
    "swapAssignmentActivity",
  );
  const res = await fn(input);
  return res.data;
}

export function swapAssignmentActivityErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "functions/failed-precondition":
        return (
          err.message ||
          "Esta sala já começou a atividade — não é possível trocar a versão."
        );
      case "functions/invalid-argument":
        return err.message || "Confira os dados da troca.";
      case "functions/permission-denied":
        return "Apenas professores podem trocar a atividade de uma atribuição.";
      case "functions/not-found":
        return "Sala, atribuição ou atividade não encontrada.";
      default:
        return "Não foi possível aplicar esta versão. Tente novamente.";
    }
  }
  return "Não foi possível aplicar esta versão. Tente novamente.";
}
