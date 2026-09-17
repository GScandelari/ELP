import { getFirestore, type Query } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { withStructuredLogging } from "../lib/logging";

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;

/**
 * Aplica a política de retenção (docs/lgpd/politica-de-retencao.md) —
 * só expiração baseada em tempo absoluto, não em ação do usuário
 * (isso já é `deleteUserData`, síncrono — ver docs/plano-fase-6.md §4.3).
 * Separada da função agendada em si pra ser testável direto por
 * integração, mesmo padrão de `releaseResultsOnDueDateOnce`/
 * `aggregateResultOnce`.
 *
 * - `auditLog`: apaga entradas com mais de 6 meses.
 * - `consents/*\/records`: apaga registros de contas **já anonimizadas**
 *   (`users/{uid}.status == 'DELETED'`, escrito por `deleteUserData`)
 *   há mais de 5 anos — `updatedAt` do `users/{uid}` é o marco de
 *   quando a anonimização aconteceu. Contas ativas nunca são tocadas
 *   aqui: o consentimento é prova legal enquanto a conta existir.
 */
export async function purgeExpiredDataOnce(): Promise<{
  auditLogPurged: number;
  consentsPurged: number;
}> {
  const db = getFirestore();
  const now = Date.now();

  const auditLogPurged = await purgeCollection(
    db
      .collection("auditLog")
      .where("timestamp", "<", new Date(now - SIX_MONTHS_MS)),
  );

  const deletedUsersSnap = await db
    .collection("users")
    .where("status", "==", "DELETED")
    .where("updatedAt", "<", new Date(now - FIVE_YEARS_MS))
    .get();

  let consentsPurged = 0;
  for (const userDoc of deletedUsersSnap.docs) {
    consentsPurged += await purgeCollection(
      db.collection(`consents/${userDoc.id}/records`),
    );
  }

  return { auditLogPurged, consentsPurged };
}

async function purgeCollection(query: Query): Promise<number> {
  const snap = await query.get();
  if (snap.empty) return 0;
  const batch = getFirestore().batch();
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
  return snap.size;
}

export const purgeExpiredData = onSchedule("every 24 hours", async () => {
  await withStructuredLogging(
    "purgeExpiredData",
    {},
    () => purgeExpiredDataOnce(),
    (counts) => counts,
  );
});
