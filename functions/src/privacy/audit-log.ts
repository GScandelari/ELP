import { FieldValue, getFirestore } from "firebase-admin/firestore";

/**
 * Grava uma entrada em `auditLog` (RNF-006, `docs/lgpd/registro-de-tratamento.md`
 * item 5) — só as Cloud Functions sensíveis a LGPD chamam isto
 * (docs/plano-fase-6.md §4.4). Sem leitura pelo client (rule: `allow
 * read, write: if false`, só Admin SDK); retenção de 6 meses aplicada
 * por `purgeExpiredData` (PR 6.3).
 */
export async function logAudit(
  uid: string,
  action: string,
  ip: string | null,
): Promise<void> {
  const db = getFirestore();
  await db.collection("auditLog").add({
    uid,
    action,
    ip,
    timestamp: FieldValue.serverTimestamp(),
  });
}
