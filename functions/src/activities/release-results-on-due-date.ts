import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

/**
 * Libera os resultados de assignments com `resultsPolicy: 'ON_DUE_DATE'`
 * cujo prazo já passou (ADR-013 §2). Separada da função agendada em si
 * pra ser testável direto por integração, sem depender do harness de
 * scheduler do `firebase-functions-test`.
 */
export async function releaseResultsOnDueDateOnce(): Promise<number> {
  const db = getFirestore();
  const now = new Date();

  const snap = await db
    .collectionGroup("assignments")
    .where("resultsPolicy", "==", "ON_DUE_DATE")
    .where("resultsReleased", "==", false)
    .get();

  const batch = db.batch();
  let count = 0;
  for (const doc of snap.docs) {
    const dueDate = doc.get("dueDate");
    if (typeof dueDate !== "string") continue;
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime()) || due > now) continue;
    batch.update(doc.ref, {
      resultsReleased: true,
      resultsReleasedAt: FieldValue.serverTimestamp(),
    });
    count++;
  }
  if (count > 0) {
    await batch.commit();
  }
  return count;
}

export const releaseResultsOnDueDate = onSchedule(
  "every 60 minutes",
  async () => {
    await releaseResultsOnDueDateOnce();
  },
);
