import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

/**
 * Atualiza `classes/{classId}/resultsSummary/{studentId}` com o
 * resultado de uma tentativa corrigida (RF-018/UC-007, Fase 5). Só
 * sobrescreve a entrada existente do assignment quando a nova
 * pontuação é maior — "melhor tentativa vence" quando `allowRetry`
 * permite mais de uma (docs/plano-fase-5.md §8 decisão 1). Separada do
 * trigger em si pra ser testável direto por integração, mesmo padrão
 * de `releaseResultsOnDueDateOnce`.
 */
export async function aggregateResultOnce(
  attemptResultId: string,
): Promise<void> {
  const db = getFirestore();
  const resultSnap = await db.doc(`attemptResults/${attemptResultId}`).get();
  if (!resultSnap.exists) return;

  const data = resultSnap.data()!;
  const studentId = data.studentId as string | undefined;
  const classId = data.classId as string | undefined;
  const assignmentId = data.assignmentId as string | undefined;
  const score = data.score as number | undefined;
  const maxScore = data.maxScore as number | undefined;
  if (
    !studentId ||
    !classId ||
    !assignmentId ||
    score == null ||
    maxScore == null
  ) {
    return;
  }

  const classSnap = await db.doc(`classes/${classId}`).get();
  if (!classSnap.exists) return;
  const accountId = classSnap.get("accountId");

  const summaryRef = db.doc(`classes/${classId}/resultsSummary/${studentId}`);

  await db.runTransaction(async (tx) => {
    const summarySnap = await tx.get(summaryRef);
    const existingScore = summarySnap.exists
      ? summarySnap.data()?.assignmentScores?.[assignmentId]?.score
      : undefined;

    // melhor tentativa vence - uma pontuação já registrada e maior ou
    // igual à nova não é sobrescrita (docs/plano-fase-5.md §8 decisão 1)
    if (typeof existingScore === "number" && existingScore >= score) return;

    tx.set(
      summaryRef,
      {
        accountId,
        assignmentScores: {
          [assignmentId]: {
            score,
            maxScore,
            submittedAt: data.gradedAt ?? null,
          },
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export const aggregateResult = onDocumentCreated(
  "attemptResults/{attemptResultId}",
  async (event) => {
    await aggregateResultOnce(event.params.attemptResultId);
  },
);
