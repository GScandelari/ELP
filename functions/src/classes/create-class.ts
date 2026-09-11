import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { generateCode } from "./enrollment-code";

type Payload = {
  name?: unknown;
  description?: unknown;
};

/** Tentativas de gerar um código livre antes de desistir (RN-001). */
const MAX_CODE_ATTEMPTS = 5;

/** Sinaliza colisão de código para o laço de retry — não vaza ao cliente. */
class CodeCollision extends Error {
  override readonly name = "CodeCollision";
}

/**
 * Cria uma sala do professor com um código de inscrição único (RF-004,
 * RN-001, UC-002).
 *
 * A geração do código precisa ser transacional contra `enrollmentCodes/{code}`
 * (coleção fechada ao cliente), por isso a criação da sala passa por aqui em
 * vez de escrita direta no Firestore. `classes/{classId}` e
 * `enrollmentCodes/{code}` são gravados no mesmo commit.
 */
export const createClass = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
  }
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError(
      "permission-denied",
      "Apenas professores podem criar salas.",
    );
  }

  const data = (request.data ?? {}) as Payload;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const description =
    typeof data.description === "string" ? data.description.trim() : "";

  if (name.length < 2 || name.length > 80) {
    throw new HttpsError(
      "invalid-argument",
      "O nome da sala deve ter entre 2 e 80 caracteres.",
    );
  }
  if (description.length > 500) {
    throw new HttpsError(
      "invalid-argument",
      "A descrição deve ter no máximo 500 caracteres.",
    );
  }

  const uid = request.auth.uid;
  const db = getFirestore();

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateCode();
    const codeRef = db.doc(`enrollmentCodes/${code}`);
    const classRef = db.collection("classes").doc();

    try {
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(codeRef);
        if (existing.exists) throw new CodeCollision();

        const now = FieldValue.serverTimestamp();
        tx.set(classRef, {
          accountId: uid,
          name,
          description,
          enrollmentCode: code,
          status: "ACTIVE",
          studentCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        tx.set(codeRef, {
          classId: classRef.id,
          accountId: uid,
          createdAt: now,
        });
      });

      return { classId: classRef.id, enrollmentCode: code };
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
