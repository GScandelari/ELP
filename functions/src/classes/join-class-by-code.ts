import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { isValidCode, normalizeCode } from "./enrollment-code";

type Payload = {
  code?: unknown;
};

/**
 * Aluno entra numa sala usando o código de inscrição (RF-006, UC-003).
 *
 * RN-002 (só sala ativa aceita autoinscrição) e RN-003 (não pode se
 * inscrever duas vezes) são validados numa transação contra
 * `enrollmentCodes/{code}` e `classes/{classId}/enrollments/{uid}`.
 *
 * Defesa em profundidade: aluno menor (`users/{uid}.isMinor == true`) não
 * se autoinscreve — a conta dele só existe porque um professor a criou e
 * já o vinculou a uma sala (RF-021); o self-service nunca chega aqui
 * porque `finalizeSignup` já bloqueia o cadastro de menor.
 */
export const joinClassByCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
  }
  if (request.auth.token.role !== "student") {
    throw new HttpsError(
      "permission-denied",
      "Apenas alunos podem entrar em uma sala por código.",
    );
  }

  const uid = request.auth.uid;
  const data = (request.data ?? {}) as Payload;
  const rawCode = typeof data.code === "string" ? data.code : "";
  const code = normalizeCode(rawCode);

  const db = getFirestore();

  const userSnap = await db.doc(`users/${uid}`).get();
  if (userSnap.get("isMinor") === true) {
    throw new HttpsError(
      "failed-precondition",
      "Alunos menores de 18 anos são inscritos pelo professor ou pela escola.",
    );
  }

  if (!isValidCode(code)) {
    throw new HttpsError("not-found", "Código não encontrado.");
  }

  const codeSnap = await db.doc(`enrollmentCodes/${code}`).get();
  if (!codeSnap.exists) {
    throw new HttpsError("not-found", "Código não encontrado.");
  }
  const classId = codeSnap.get("classId") as string;
  const classRef = db.doc(`classes/${classId}`);
  const enrollmentRef = classRef.collection("enrollments").doc(uid);

  const className = await db.runTransaction(async (tx) => {
    const [classSnap, enrollmentSnap] = await Promise.all([
      tx.get(classRef),
      tx.get(enrollmentRef),
    ]);

    if (!classSnap.exists) {
      throw new HttpsError("not-found", "Código não encontrado.");
    }
    if (classSnap.get("status") !== "ACTIVE") {
      throw new HttpsError(
        "failed-precondition",
        "Esta sala não está aceitando inscrições no momento.",
      );
    }

    if (enrollmentSnap.exists && enrollmentSnap.get("status") === "ACTIVE") {
      throw new HttpsError("already-exists", "Você já está nesta sala.");
    }

    const now = FieldValue.serverTimestamp();
    if (enrollmentSnap.exists) {
      // reingresso: reativa em vez de duplicar o documento
      tx.update(enrollmentRef, { status: "ACTIVE", rejoinedAt: now });
    } else {
      tx.set(enrollmentRef, {
        studentId: uid,
        // accountId denormalizado do dono da sala — usado pela rule de
        // leitura (evita um get() que quebra em query de collection group)
        accountId: classSnap.get("accountId"),
        enrollmentType: "SELF_ENROLLMENT",
        status: "ACTIVE",
        studentName: userSnap.get("name") ?? "",
        studentEmail: userSnap.get("email") ?? "",
        createdAt: now,
      });
    }
    tx.update(classRef, {
      studentCount: FieldValue.increment(1),
      updatedAt: now,
    });

    return classSnap.get("name") as string;
  });

  return { classId, className };
});
