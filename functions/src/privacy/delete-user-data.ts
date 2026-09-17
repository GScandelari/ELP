import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { withStructuredLogging } from "../lib/logging";
import { logAudit } from "./audit-log";

const ANONYMIZED_NAME = "Usuário excluído";

/**
 * Anonimiza os dados do próprio usuário e exclui a conta (RF-020,
 * ADR-011 §4) — síncrono, sem período de carência ("exclusão =
 * anonimização"). Aluno: `studentId` nos próprios `attempts`/
 * `attemptResults` vira um token não reversível; nome/e-mail somem do
 * `enrollments` de cada sala. Professor: só os identificadores diretos
 * da própria conta — salas/atividades **não são apagadas nem
 * anonimizadas** (pertencem à relação educacional em andamento e
 * ainda servem alunos matriculados; limitação documentada em
 * docs/plano-fase-6.md §4.2/§10). `resultsSummary` nunca é tocado —
 * já é uma agregação sem identificador direto (ADR-011 §4).
 */
export const deleteUserData = onCall(async (request) => {
  return withStructuredLogging(
    "deleteUserData",
    { uid: request.auth?.uid ?? null },
    async () => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
      }

      const uid = request.auth.uid;
      const role = request.auth.token.role;
      const db = getFirestore();

      const userRef = db.doc(`users/${uid}`);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        throw new HttpsError("not-found", "Conta não encontrada.");
      }

      const now = FieldValue.serverTimestamp();
      const batch = db.batch();

      batch.update(userRef, {
        name: ANONYMIZED_NAME,
        email: null,
        status: "DELETED",
        updatedAt: now,
      });

      if (role === "student") {
        const anonymizedToken = `deleted-${uid}`;

        const enrollmentsSnap = await db
          .collectionGroup("enrollments")
          .where("studentId", "==", uid)
          .get();
        for (const doc of enrollmentsSnap.docs) {
          batch.update(doc.ref, {
            studentName: ANONYMIZED_NAME,
            studentEmail: "",
          });
        }

        const attemptsSnap = await db
          .collection("attempts")
          .where("studentId", "==", uid)
          .get();
        for (const doc of attemptsSnap.docs) {
          batch.update(doc.ref, { studentId: anonymizedToken });
        }

        const resultsSnap = await db
          .collection("attemptResults")
          .where("studentId", "==", uid)
          .get();
        for (const doc of resultsSnap.docs) {
          batch.update(doc.ref, { studentId: anonymizedToken });
        }
      }

      await batch.commit();
      await logAudit(uid, "deleteUserData", request.rawRequest?.ip ?? null);
      await getAuth().deleteUser(uid);

      return { ok: true };
    },
  );
});
