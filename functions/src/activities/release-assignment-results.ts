import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

type Payload = {
  classId?: unknown;
  assignmentId?: unknown;
};

/**
 * Libera os resultados de um assignment para os alunos (RF-017, ADR-013).
 * Escrita única — `attemptResults` não denormaliza `resultsReleased`
 * (docs/plano-fase-4.md §2), então não há fan-out sobre as tentativas.
 */
export const releaseAssignmentResults = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
  }
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError(
      "permission-denied",
      "Apenas professores podem liberar resultados.",
    );
  }

  const data = (request.data ?? {}) as Payload;
  const classId = typeof data.classId === "string" ? data.classId : "";
  const assignmentId =
    typeof data.assignmentId === "string" ? data.assignmentId : "";
  if (!classId || !assignmentId) {
    throw new HttpsError("invalid-argument", "Sala ou atribuição inválida.");
  }

  const uid = request.auth.uid;
  const db = getFirestore();

  const classRef = db.doc(`classes/${classId}`);
  const assignmentRef = classRef.collection("assignments").doc(assignmentId);
  const [classSnap, assignmentSnap] = await Promise.all([
    classRef.get(),
    assignmentRef.get(),
  ]);

  if (!classSnap.exists) {
    throw new HttpsError("not-found", "Sala não encontrada.");
  }
  if (!assignmentSnap.exists) {
    throw new HttpsError("not-found", "Atribuição não encontrada.");
  }
  if (classSnap.get("accountId") !== uid) {
    throw new HttpsError("permission-denied", "Esta sala não é sua.");
  }
  if (assignmentSnap.get("accountId") !== uid) {
    throw new HttpsError("permission-denied", "Esta atribuição não é sua.");
  }

  await assignmentRef.update({
    resultsReleased: true,
    resultsReleasedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true };
});
