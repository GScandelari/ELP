import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { generateCode } from "./enrollment-code";

type Payload = {
  classId?: unknown;
};

/** Tentativas de gerar um código livre antes de desistir (mesma lógica do createClass). */
const MAX_CODE_ATTEMPTS = 5;

class CodeCollision extends Error {
  override readonly name = "CodeCollision";
}

/**
 * Gera um novo código de inscrição para a sala, invalidando o anterior —
 * útil se o código vazou (RF-005). Só o professor dono (RN-004).
 */
export const rotateEnrollmentCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
  }
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError(
      "permission-denied",
      "Apenas professores podem gerar um novo código.",
    );
  }

  const data = (request.data ?? {}) as Payload;
  const classId = typeof data.classId === "string" ? data.classId : "";
  if (!classId) {
    throw new HttpsError("invalid-argument", "Sala inválida.");
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
  const oldCode = classSnap.get("enrollmentCode") as string;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const newCode = generateCode();
    const newCodeRef = db.doc(`enrollmentCodes/${newCode}`);

    try {
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(newCodeRef);
        if (existing.exists) throw new CodeCollision();

        const now = FieldValue.serverTimestamp();
        tx.delete(db.doc(`enrollmentCodes/${oldCode}`));
        tx.set(newCodeRef, { classId, accountId: uid, createdAt: now });
        tx.update(classRef, { enrollmentCode: newCode, updatedAt: now });
      });

      return { enrollmentCode: newCode };
    } catch (err) {
      if (err instanceof CodeCollision) continue;
      throw err;
    }
  }

  throw new HttpsError(
    "resource-exhausted",
    "Não foi possível gerar um código único. Tente novamente.",
  );
});
