"use client";

import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";

export type AttemptStatus = "IN_PROGRESS" | "GRADED";

export type Attempt = {
  id: string;
  assignmentId: string;
  classId: string;
  activityId: string;
  status: AttemptStatus;
};

function mapAttempt(
  id: string,
  data: DocumentData | undefined,
): Attempt | null {
  if (!data) return null;
  return {
    id,
    assignmentId: data.assignmentId ?? "",
    classId: data.classId ?? "",
    activityId: data.activityId ?? "",
    status: data.status ?? "IN_PROGRESS",
  };
}

/** Observa a própria tentativa (RF-013/RF-017) — a rule já permite ao dono. */
export function watchAttempt(
  attemptId: string,
  onChange: (attempt: Attempt | null) => void,
): Unsubscribe {
  const { db } = getFirebase();
  return onSnapshot(
    doc(db, "attempts", attemptId),
    (snap) => onChange(mapAttempt(snap.id, snap.data())),
    () => onChange(null),
  );
}

/**
 * Busca (uma vez) a tentativa do aluno para este assignment, se já
 * existir — usado ao carregar a tela de resolução para não chamar
 * `createAttempt` de novo numa tentativa já `GRADED` (o que falharia por
 * RN-007 ao revisitar a atividade depois de enviar). A rule permite
 * `list` aqui porque o filtro do próprio `where` bate exatamente com
 * `resource.data.studentId` (a lição de list/get do projeto).
 */
export async function fetchMyAttempt(
  assignmentId: string,
  studentId: string,
): Promise<Attempt | null> {
  const { db } = getFirebase();
  const snap = await getDocs(
    query(
      collection(db, "attempts"),
      where("studentId", "==", studentId),
      where("assignmentId", "==", assignmentId),
    ),
  );
  const attempts = snap.docs
    .map((d) => mapAttempt(d.id, d.data()))
    .filter((a): a is Attempt => a !== null);
  return (
    attempts.find((a) => a.status === "IN_PROGRESS") ??
    attempts.find((a) => a.status === "GRADED") ??
    null
  );
}

export type AttemptResult = {
  score: number;
  maxScore: number;
  items: { itemId: string; isCorrect: boolean; pointsAwarded: number }[];
};

/**
 * Lê (uma vez) a nota da tentativa — `attemptResults/{id}` só é legível
 * quando `resultsReleased == true` (RN-011/ADR-013, docs/plano-fase-4.md
 * §2); antes disso a regra nega com `permission-denied`, tratado aqui
 * como "ainda não liberado" em vez de erro. Leitura única (não observa)
 * — revisitar a tela depois da liberação é um refresh, não algo ao vivo
 * nesta fase.
 */
export async function fetchAttemptResult(
  attemptId: string,
): Promise<AttemptResult | null> {
  const { db } = getFirebase();
  try {
    const snap = await getDoc(doc(db, "attemptResults", attemptId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      score: data.score ?? 0,
      maxScore: data.maxScore ?? 0,
      items: data.items ?? [],
    };
  } catch {
    return null; // permission-denied = ainda não liberado
  }
}

/**
 * Lê (uma vez, não observa) as respostas já salvas — usado só para
 * restaurar o progresso ao retomar uma tentativa `IN_PROGRESS`. Depois
 * disso o estado local do formulário é a fonte da verdade da sessão,
 * sem re-sincronizar a cada escrita (evita brigar com o próprio debounce
 * de salvar progresso).
 */
export async function fetchAttemptAnswers(
  attemptId: string,
): Promise<Record<string, unknown>> {
  const { db } = getFirebase();
  const snap = await getDocs(collection(db, "attempts", attemptId, "answers"));
  const result: Record<string, unknown> = {};
  for (const d of snap.docs) {
    result[d.id] = d.data().answerPayload;
  }
  return result;
}

/**
 * Salva o progresso de um item (RF-013) — escrita direta, protegida pela
 * rule (só o dono do attempt, só enquanto `IN_PROGRESS`).
 */
export async function saveAnswer(
  attemptId: string,
  itemId: string,
  answerPayload: unknown,
): Promise<void> {
  const { db } = getFirebase();
  await setDoc(doc(db, "attempts", attemptId, "answers", itemId), {
    answerPayload,
  });
}

export type CreateAttemptResult = { attemptId: string; status: AttemptStatus };

/** Cria ou recupera a tentativa do aluno para um assignment (UC-006 passo 3). */
export async function createAttempt(
  classId: string,
  assignmentId: string,
): Promise<CreateAttemptResult> {
  const { functions } = getFirebase();
  const fn = httpsCallable<
    { classId: string; assignmentId: string },
    CreateAttemptResult
  >(functions, "createAttempt");
  const res = await fn({ classId, assignmentId });
  return res.data;
}

export function createAttemptErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "functions/failed-precondition":
        return (
          err.message ||
          "Esta atividade não está disponível ou você já usou todas as tentativas."
        );
      case "functions/permission-denied":
        return "Você não está inscrito nesta sala.";
      case "functions/not-found":
        return "Sala ou atividade não encontrada.";
      default:
        return "Não foi possível iniciar a atividade. Tente novamente.";
    }
  }
  return "Não foi possível iniciar a atividade. Tente novamente.";
}

export type SubmitAttemptResult = {
  status: "GRADED";
  resultsReleased: boolean;
  score?: number;
  maxScore?: number;
};

/** Envia e corrige a tentativa (UC-006 passos 6-8). */
export async function submitAttempt(
  attemptId: string,
  answers: Record<string, unknown>,
): Promise<SubmitAttemptResult> {
  const { functions } = getFirebase();
  const fn = httpsCallable<
    { attemptId: string; answers: Record<string, unknown> },
    SubmitAttemptResult
  >(functions, "submitAttempt");
  const res = await fn({ attemptId, answers });
  return res.data;
}

export function submitAttemptErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "functions/failed-precondition":
        return err.message || "Esta tentativa já foi enviada.";
      case "functions/permission-denied":
        return "Esta tentativa não é sua.";
      case "functions/not-found":
        return "Tentativa não encontrada.";
      default:
        return "Não foi possível enviar. Tente novamente.";
    }
  }
  return "Não foi possível enviar. Tente novamente.";
}
