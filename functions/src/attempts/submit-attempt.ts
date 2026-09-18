import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getActivityTypeHandler } from "../activity-types";

type Payload = {
  attemptId?: unknown;
  answers?: unknown;
};

/**
 * Envia e corrige uma tentativa (UC-006 passos 6-8, RF-014, RF-015,
 * RN-008). A correção acontece aqui, no servidor, na mesma chamada —
 * os 4 tipos do MVP são objetivos, sem janela real de "enviado mas
 * ainda não corrigido" (docs/plano-fase-4.md §3.1).
 *
 * `attempts/{id}` e `attempts/{id}/answers/{itemId}` NUNCA recebem
 * `isCorrect`/`pointsAwarded`/`score` — essa é a separação central da
 * fase (docs/plano-fase-4.md §2): só `attemptResults/{id}` carrega
 * nota, e a regra dela é que impede o aluno de ler antes da liberação.
 */
export const submitAttempt = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
    }
    if (request.auth.token.role !== "student") {
      throw new HttpsError(
        "permission-denied",
        "Apenas alunos podem enviar uma tentativa.",
      );
    }

    const data = (request.data ?? {}) as Payload;
    const attemptId = typeof data.attemptId === "string" ? data.attemptId : "";
    if (!attemptId) {
      throw new HttpsError("invalid-argument", "Tentativa inválida.");
    }
    const answers =
      data.answers !== null &&
      typeof data.answers === "object" &&
      !Array.isArray(data.answers)
        ? (data.answers as Record<string, unknown>)
        : null;
    if (!answers) {
      throw new HttpsError("invalid-argument", "Respostas inválidas.");
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    const attemptRef = db.doc(`attempts/${attemptId}`);
    const attemptSnap = await attemptRef.get();
    if (!attemptSnap.exists) {
      throw new HttpsError("not-found", "Tentativa não encontrada.");
    }
    if (attemptSnap.get("studentId") !== uid) {
      throw new HttpsError("permission-denied", "Esta tentativa não é sua.");
    }
    if (attemptSnap.get("status") !== "IN_PROGRESS") {
      throw new HttpsError(
        "failed-precondition",
        "Esta tentativa já foi enviada.",
      );
    }

    const classId = attemptSnap.get("classId");
    const assignmentId = attemptSnap.get("assignmentId");
    const assignmentRef = db.doc(
      `classes/${classId}/assignments/${assignmentId}`,
    );
    const [assignmentSnap, keysSnap] = await Promise.all([
      assignmentRef.get(),
      db.doc(`assignmentKeys/${assignmentId}`).get(),
    ]);
    if (!assignmentSnap.exists || !keysSnap.exists) {
      throw new HttpsError("not-found", "Atribuição não encontrada.");
    }

    const handler = getActivityTypeHandler(assignmentSnap.get("type"));
    const gradingConfig = (keysSnap.get("gradingConfig") ?? []) as {
      itemId: string;
      points: number;
      grading: unknown;
    }[];

    const resultItems: {
      itemId: string;
      isCorrect: boolean;
      pointsAwarded: number;
    }[] = [];
    let score = 0;
    let maxScore = 0;

    const now = FieldValue.serverTimestamp();
    const batch = db.batch();

    for (const entry of gradingConfig) {
      const answer = answers[entry.itemId] ?? null;
      const { isCorrect, pointsAwarded } = handler.score(
        answer,
        entry.grading,
        entry.points,
      );
      resultItems.push({ itemId: entry.itemId, isCorrect, pointsAwarded });
      score += pointsAwarded;
      maxScore += entry.points;

      // sem gabarito nem correção aqui - só o que o aluno respondeu (§2)
      batch.set(attemptRef.collection("answers").doc(entry.itemId), {
        answerPayload: answer,
      });
    }

    batch.update(attemptRef, { status: "GRADED", submittedAt: now });
    batch.set(db.doc(`attemptResults/${attemptId}`), {
      studentId: uid,
      classId,
      assignmentId,
      score,
      maxScore,
      items: resultItems,
      gradedAt: now,
    });

    await batch.commit();

    const resultsReleased = assignmentSnap.get("resultsReleased") === true;
    return resultsReleased
      ? { status: "GRADED", resultsReleased: true, score, maxScore }
      : { status: "GRADED", resultsReleased: false };
  },
);
