"use client";

import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
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

/**
 * Edita nome/descrição/status da sala (RF-005) — escrita direta, a rule já
 * trava os campos controlados pelo backend (accountId, enrollmentCode,
 * studentCount).
 */
export async function updateClass(
  classId: string,
  patch: Partial<Pick<ClassSummary, "name" | "description" | "status">>,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, "classes", classId), patch);
}

export type RotateCodeResult = { enrollmentCode: string };

/** Gera um novo código de inscrição, invalidando o anterior. */
export async function rotateEnrollmentCode(
  classId: string,
): Promise<RotateCodeResult> {
  const { functions } = getFirebase();
  const fn = httpsCallable<{ classId: string }, RotateCodeResult>(
    functions,
    "rotateEnrollmentCode",
  );
  const res = await fn({ classId });
  return res.data;
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

export type MyClassSummary = {
  classId: string;
  name: string;
  description: string;
  status: ClassStatus;
  enrollmentType: "SELF_ENROLLMENT" | "TEACHER_ASSIGNED";
};

export type JoinClassResult = { classId: string; className: string };

/** Aluno entra numa sala pelo código, via callable `joinClassByCode` (RF-006, UC-003). */
export async function joinClassByCode(code: string): Promise<JoinClassResult> {
  const { functions } = getFirebase();
  const fn = httpsCallable<{ code: string }, JoinClassResult>(
    functions,
    "joinClassByCode",
  );
  const res = await fn({ code });
  return res.data;
}

/**
 * Observa as salas em que o aluno está inscrito (collection group,
 * `where('studentId','==', uid)`) e resolve o nome/descrição/status de
 * cada uma. A regra de `list` só prova pelo filtro em `studentId` — ver
 * docs/plano-fase-2.md §8.1 — por isso a query nunca pode omitir esse
 * `where`.
 */
export function watchMyClasses(
  uid: string,
  onChange: (classes: MyClassSummary[]) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collectionGroup(db, "enrollments"),
    where("studentId", "==", uid),
    where("status", "==", "ACTIVE"),
  );
  return onSnapshot(
    q,
    async (snap) => {
      const items = await Promise.all(
        snap.docs.map(async (enrollmentDoc) => {
          const classRef = enrollmentDoc.ref.parent.parent;
          const classSnap = classRef ? await getDoc(classRef) : null;
          const classData = classSnap?.data();
          return {
            classId: classRef?.id ?? "",
            name: classData?.name ?? "",
            description: classData?.description ?? "",
            status: (classData?.status as ClassStatus) ?? "ACTIVE",
            enrollmentType: enrollmentDoc.data().enrollmentType,
          } satisfies MyClassSummary;
        }),
      );
      onChange(items);
    },
    () => onChange([]),
  );
}

export type RosterEntry = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrollmentType: "SELF_ENROLLMENT" | "TEACHER_ASSIGNED";
};

/**
 * Observa o roster de uma sala. `accountId` no filtro não restringe nada
 * na prática (é o mesmo em todo enrollment da sala) — está aí porque é o
 * que faz a rule de `list` provar o acesso do professor (ver
 * docs/plano-fase-2.md §8.1); omiti-lo faz a query ser negada.
 */
export function watchRoster(
  classId: string,
  teacherUid: string,
  onChange: (roster: RosterEntry[]) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collection(db, "classes", classId, "enrollments"),
    where("accountId", "==", teacherUid),
    where("status", "==", "ACTIVE"),
  );
  return onSnapshot(
    q,
    (snap) => {
      const roster = snap.docs
        .map((d) => d.data())
        .map(
          (data): RosterEntry => ({
            studentId: data.studentId,
            studentName: data.studentName ?? "",
            studentEmail: data.studentEmail ?? "",
            enrollmentType: data.enrollmentType,
          }),
        )
        .sort((a, b) => a.studentName.localeCompare(b.studentName));
      onChange(roster);
    },
    () => onChange([]),
  );
}

export type AddStudentInput = {
  classId: string;
  studentEmail: string;
  studentName: string;
  isMinor: boolean;
  guardianConsent?: { guardianName: string; statementAccepted: true };
};

export type AddStudentResult = {
  studentId: string;
  enrollmentType: "TEACHER_ASSIGNED";
  /** Só vem preenchido quando a conta do aluno foi criada agora ("caso B"). */
  passwordSetupLink?: string;
};

/**
 * Inscreve manualmente um aluno (RF-007). Se o e-mail já tem conta, só
 * inscreve ("caso A"); senão cria a conta ("caso B") — para menor de 18
 * anos (RF-021), `guardianConsent` é obrigatório.
 */
export async function addStudentToClass(
  input: AddStudentInput,
): Promise<AddStudentResult> {
  const { functions } = getFirebase();
  const fn = httpsCallable<AddStudentInput, AddStudentResult>(
    functions,
    "addStudentToClass",
  );
  const res = await fn(input);
  return res.data;
}

export function addStudentErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "functions/already-exists":
        return "Este aluno já está nesta sala.";
      case "functions/invalid-argument":
        return err.message || "Confira os dados informados.";
      case "functions/failed-precondition":
        return (
          err.message ||
          "Para alunos menores de 18 anos, confirme o consentimento do responsável."
        );
      case "functions/permission-denied":
        return "Apenas professores podem inscrever alunos.";
      default:
        return "Não foi possível inscrever o aluno. Tente novamente.";
    }
  }
  return "Não foi possível inscrever o aluno. Tente novamente.";
}

/** Remove um aluno da sala (RF-005) — marca REMOVED, não apaga. */
export async function removeStudentFromClass(
  classId: string,
  studentId: string,
): Promise<void> {
  const { functions } = getFirebase();
  const fn = httpsCallable<
    { classId: string; studentId: string },
    { ok: boolean }
  >(functions, "removeStudentFromClass");
  await fn({ classId, studentId });
}

export function joinClassErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "functions/not-found":
        return "Código não encontrado. Confira com o professor.";
      case "functions/failed-precondition":
        return err.message || "Não foi possível entrar nesta sala.";
      case "functions/already-exists":
        return "Você já está nesta sala.";
      case "functions/permission-denied":
        return "Apenas alunos podem entrar em uma sala por código.";
      default:
        return "Não foi possível entrar na sala. Tente novamente.";
    }
  }
  return "Não foi possível entrar na sala. Tente novamente.";
}
