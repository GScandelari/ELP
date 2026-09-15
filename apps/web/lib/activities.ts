"use client";

import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import {
  addDoc,
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

/** Tipos de atividade do MVP (RF-009), em ordem de implementação (Fase 3). */
export type ActivityType =
  | "MULTIPLE_CHOICE"
  | "FILL_IN_BLANKS"
  | "TRANSLATION"
  | "MEANING_MATCHING";

/** Rótulo em pt-BR de cada tipo — compartilhado por toda tela que mostra o tipo. */
export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  MULTIPLE_CHOICE: "Múltipla escolha",
  FILL_IN_BLANKS: "Preencher espaços",
  TRANSLATION: "Tradução/localização",
  MEANING_MATCHING: "Relacionamento de significados",
};

export type ActivityDifficulty = "EASY" | "MEDIUM" | "HARD";

/** Estado de autoria no repositório (ADR-012/ADR-014) — LOCKED nunca é setado pelo client. */
export type ActivityStatus = "DRAFT" | "READY" | "LOCKED" | "ARCHIVED";

export type ActivitySummary = {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  difficulty: ActivityDifficulty;
  tags: string[];
  status: ActivityStatus;
  locked: boolean;
  itemCount: number;
  /** Id da atividade de origem, se esta for um clone (ADR-014 §3). */
  clonedFrom: string | null;
};

function mapActivity(
  id: string,
  data: DocumentData | undefined,
): ActivitySummary | null {
  if (!data) return null;
  return {
    id,
    title: data.title ?? "",
    description: data.description ?? "",
    type: data.type,
    difficulty: data.difficulty ?? "EASY",
    tags: data.tags ?? [],
    status: data.status ?? "DRAFT",
    locked: data.locked ?? false,
    itemCount: data.itemCount ?? 0,
    clonedFrom: data.clonedFrom ?? null,
  };
}

export type CreateActivityInput = {
  title: string;
  description?: string;
  type: ActivityType;
  difficulty: ActivityDifficulty;
  tags: string[];
};

/**
 * Cria uma atividade no repositório (RF-008). Escrita direta — a rule já
 * garante dono + `status: 'DRAFT'` + `locked: false` na criação (PR 3.2).
 */
export async function createActivity(
  uid: string,
  input: CreateActivityInput,
): Promise<string> {
  const { db } = getFirebase();
  const ref = await addDoc(collection(db, "activities"), {
    accountId: uid,
    title: input.title,
    description: input.description?.trim() ?? "",
    type: input.type,
    difficulty: input.difficulty,
    tags: input.tags,
    status: "DRAFT",
    locked: false,
    itemCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Observa o repositório do professor, mais recentes primeiro. */
export function watchTeacherActivities(
  uid: string,
  onChange: (activities: ActivitySummary[]) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collection(db, "activities"),
    where("accountId", "==", uid),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs
          .map((d) => mapActivity(d.id, d.data()))
          .filter((a): a is ActivitySummary => a !== null),
      );
    },
    () => onChange([]),
  );
}

/** Observa uma atividade específica (detalhe/editor). */
export function watchActivity(
  activityId: string,
  onChange: (activity: ActivitySummary | null) => void,
): Unsubscribe {
  const { db } = getFirebase();
  return onSnapshot(
    doc(db, "activities", activityId),
    (snap) => onChange(mapActivity(snap.id, snap.data())),
    () => onChange(null),
  );
}

export type UpdateActivityInput = Partial<
  Pick<ActivitySummary, "title" | "description" | "difficulty" | "tags">
>;

/** Edita metadados (RF-010) — escrita direta, rule trava fora de DRAFT/READY/ARCHIVED. */
export async function updateActivityMeta(
  activityId: string,
  patch: UpdateActivityInput,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, "activities", activityId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Muda o estado de autoria (DRAFT ⇄ READY → ARCHIVED). `LOCKED` nunca é
 * um valor válido aqui — a rule recusa (só a Cloud Function da Fase 4 seta).
 */
export async function setActivityStatus(
  activityId: string,
  status: "DRAFT" | "READY" | "ARCHIVED",
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, "activities", activityId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export function activityErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError && err.code === "permission-denied") {
    return "Esta atividade não pode mais ser editada (já foi iniciada por um aluno).";
  }
  return "Não foi possível salvar. Tente novamente.";
}

export type CloneActivityResult = { activityId: string };

/**
 * Duplica uma atividade + todos os itens, via callable `cloneActivity`
 * (RF-022, ADR-014 §3/§7). Disponível em qualquer atividade, travada ou
 * não. O título da cópia ("{título} (vN)") é calculado no servidor.
 */
export async function cloneActivity(
  activityId: string,
): Promise<CloneActivityResult> {
  const { functions } = getFirebase();
  const fn = httpsCallable<{ activityId: string }, CloneActivityResult>(
    functions,
    "cloneActivity",
  );
  const res = await fn({ activityId });
  return res.data;
}

export function cloneActivityErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "functions/permission-denied":
        return "Apenas professores podem clonar atividades.";
      case "functions/not-found":
        return "Atividade não encontrada.";
      default:
        return "Não foi possível clonar a atividade. Tente novamente.";
    }
  }
  return "Não foi possível clonar a atividade. Tente novamente.";
}
