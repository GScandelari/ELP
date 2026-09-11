import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

type Payload = {
  classId?: unknown;
  studentId?: unknown;
};

/**
 * Remove um aluno de uma sala (RF-005). Não apaga o documento — marca
 * `status: 'REMOVED'`, preservando histórico e futuras `attempts`; o
 * aluno pode reingressar depois (pelo código ou por uma nova inscrição
 * manual), o que reativa o mesmo documento.
 */
export const removeStudentFromClass = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
  }
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError(
      "permission-denied",
      "Apenas professores podem remover alunos.",
    );
  }

  const data = (request.data ?? {}) as Payload;
  const classId = typeof data.classId === "string" ? data.classId : "";
  const studentId = typeof data.studentId === "string" ? data.studentId : "";
  if (!classId || !studentId) {
    throw new HttpsError("invalid-argument", "Dados inválidos.");
  }

  const uid = request.auth.uid;
  const db = getFirestore();
  const classRef = db.doc(`classes/${classId}`);
  const enrollmentRef = classRef.collection("enrollments").doc(studentId);

  await db.runTransaction(async (tx) => {
    const [classSnap, enrollmentSnap] = await Promise.all([
      tx.get(classRef),
      tx.get(enrollmentRef),
    ]);

    if (!classSnap.exists) {
      throw new HttpsError("not-found", "Sala não encontrada.");
    }
    if (classSnap.get("accountId") !== uid) {
      throw new HttpsError("permission-denied", "Esta sala não é sua."); // RN-004
    }
    if (!enrollmentSnap.exists || enrollmentSnap.get("status") !== "ACTIVE") {
      throw new HttpsError(
        "not-found",
        "Este aluno não está inscrito nesta sala.",
      );
    }

    const now = FieldValue.serverTimestamp();
    tx.update(enrollmentRef, { status: "REMOVED", removedAt: now });
    tx.update(classRef, {
      studentCount: FieldValue.increment(-1),
      updatedAt: now,
    });
  });

  return { ok: true };
});
