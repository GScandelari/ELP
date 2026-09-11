import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

type Payload = {
  classId?: unknown;
  studentEmail?: unknown;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Inscrição manual de um aluno que já tem conta (RF-007, "caso A" do
 * plano). O caso "aluno sem conta" — criação da conta + consentimento do
 * responsável para menor (RF-021, ADR-011) — é a PR 2.6.
 */
export const addStudentToClass = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
  }
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError(
      "permission-denied",
      "Apenas professores podem inscrever alunos.",
    );
  }

  const data = (request.data ?? {}) as Payload;
  const classId = typeof data.classId === "string" ? data.classId : "";
  const email =
    typeof data.studentEmail === "string"
      ? data.studentEmail.trim().toLowerCase()
      : "";

  if (!classId) {
    throw new HttpsError("invalid-argument", "Sala inválida.");
  }
  if (!EMAIL_RE.test(email)) {
    throw new HttpsError("invalid-argument", "Informe um e-mail válido.");
  }

  const uid = request.auth.uid;
  const db = getFirestore();

  const classRef = db.doc(`classes/${classId}`);
  const classSnap = await classRef.get();
  if (!classSnap.exists) {
    throw new HttpsError("not-found", "Sala não encontrada.");
  }
  if (classSnap.get("accountId") !== uid) {
    throw new HttpsError("permission-denied", "Esta sala não é sua."); // RN-004
  }

  let studentId: string;
  try {
    studentId = (await getAuth().getUserByEmail(email)).uid;
  } catch {
    throw new HttpsError(
      "not-found",
      "Não encontramos uma conta com este e-mail. O cadastro de um aluno " +
        "sem conta (incluindo menores de idade) chega numa próxima atualização.",
    );
  }

  const studentUserSnap = await db.doc(`users/${studentId}`).get();
  if (studentUserSnap.get("role") !== "student") {
    throw new HttpsError(
      "invalid-argument",
      "Este e-mail não pertence a uma conta de aluno.",
    );
  }

  const enrollmentRef = classRef.collection("enrollments").doc(studentId);

  await db.runTransaction(async (tx) => {
    const enrollmentSnap = await tx.get(enrollmentRef);
    if (enrollmentSnap.exists && enrollmentSnap.get("status") === "ACTIVE") {
      throw new HttpsError("already-exists", "Este aluno já está nesta sala.");
    }

    const now = FieldValue.serverTimestamp();
    if (enrollmentSnap.exists) {
      // reingresso (estava REMOVED): reativa em vez de duplicar
      tx.update(enrollmentRef, {
        status: "ACTIVE",
        enrollmentType: "TEACHER_ASSIGNED",
        rejoinedAt: now,
      });
    } else {
      tx.set(enrollmentRef, {
        studentId,
        accountId: uid, // denormalizado - ver docs/plano-fase-2.md §8.1
        enrollmentType: "TEACHER_ASSIGNED",
        status: "ACTIVE",
        studentName: studentUserSnap.get("name") ?? "",
        studentEmail: studentUserSnap.get("email") ?? email,
        createdAt: now,
      });
    }
    tx.update(classRef, {
      studentCount: FieldValue.increment(1),
      updatedAt: now,
    });
  });

  return { studentId, enrollmentType: "TEACHER_ASSIGNED" as const };
});
