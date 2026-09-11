"use client";

import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";

export type ClassStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type ClassSummary = {
  id: string;
  name: string;
  description: string;
  enrollmentCode: string;
  status: ClassStatus;
  studentCount: number;
};

function mapClass(id: string, data: DocumentData | undefined): ClassSummary | null {
  if (!data) return null;
  return {
    id,
    name: data.name ?? "",
    description: data.description ?? "",
    enrollmentCode: data.enrollmentCode ?? "",
    status: (data.status as ClassStatus) ?? "ACTIVE",
    studentCount: data.studentCount ?? 0,
  };
}

export type CreateClassInput = { name: string; description?: string };
export type CreateClassResult = { classId: string; enrollmentCode: string };

/** Cria uma sala via callable `createClass` (RF-004, UC-002). */
export async function createClass(
  input: CreateClassInput,
): Promise<CreateClassResult> {
  const { functions } = getFirebase();
  const fn = httpsCallable<CreateClassInput, CreateClassResult>(
    functions,
    "createClass",
  );
  const res = await fn(input);
  return res.data;
}

/** Observa em tempo real as salas do professor, mais recentes primeiro. */
export function watchTeacherClasses(
  uid: string,
  onChange: (classes: ClassSummary[]) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collection(db, "classes"),
    where("accountId", "==", uid),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    onChange(
      snap.docs
        .map((d) => mapClass(d.id, d.data()))
        .filter((c): c is ClassSummary => c !== null),
    );
  });
}

/**
 * Observa uma sala específica (detalhe). Sala inexistente e sala de outro
 * professor (bloqueada pela rule, `permission-denied`) chegam do mesmo jeito
 * ao chamador: `null` — a tela de detalhe não distingue os dois casos.
 */
export function watchClass(
  classId: string,
  onChange: (klass: ClassSummary | null) => void,
): Unsubscribe {
  const { db } = getFirebase();
  return onSnapshot(
    doc(db, "classes", classId),
    (snap) => onChange(mapClass(snap.id, snap.data())),
    () => onChange(null),
  );
}

export async function getClassOnce(classId: string): Promise<ClassSummary | null> {
  const { db } = getFirebase();
  const snap = await getDoc(doc(db, "classes", classId));
  return mapClass(snap.id, snap.data());
}

export function createClassErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "functions/permission-denied":
        return "Apenas professores podem criar salas.";
      case "functions/invalid-argument":
        return err.message || "Confira os dados da sala.";
      case "functions/resource-exhausted":
        return "Não foi possível gerar um código único agora. Tente novamente.";
      default:
        return "Não foi possível criar a sala. Tente novamente.";
    }
  }
  return "Não foi possível criar a sala. Tente novamente.";
}
