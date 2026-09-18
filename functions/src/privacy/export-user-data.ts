import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { withStructuredLogging } from "../lib/logging";
import { logAudit } from "./audit-log";

/**
 * Devolve os dados do próprio usuário autenticado (Art. 18 LGPD,
 * portabilidade, RF-020/ADR-011 §4). Sem gate por `resultsReleased`:
 * é o titular pedindo os próprios dados brutos, não a experiência
 * pedagógica de sala de aula (RN-011) — os dois são preocupações
 * diferentes (docs/plano-fase-6.md §4.1).
 *
 * Escopo do professor não inclui dados pessoais de alunos das suas
 * salas (nome/e-mail do roster) — "meus dados" é a conta e o
 * repositório do próprio professor, não o de terceiros.
 */
export const exportUserData = onCall(
  { enforceAppCheck: true },
  async (request) => {
    return withStructuredLogging(
      "exportUserData",
      { uid: request.auth?.uid ?? null },
      async () => {
        if (!request.auth) {
          throw new HttpsError(
            "unauthenticated",
            "É preciso estar autenticado.",
          );
        }

        const uid = request.auth.uid;
        const role = request.auth.token.role;
        const db = getFirestore();

        const userSnap = await db.doc(`users/${uid}`).get();
        if (!userSnap.exists) {
          throw new HttpsError("not-found", "Conta não encontrada.");
        }

        const data: Record<string, unknown> = {
          exportedAt: new Date().toISOString(),
          account: { id: uid, ...userSnap.data() },
        };

        if (role === "teacher") {
          const [accountSnap, classesSnap, activitiesSnap] = await Promise.all([
            db.doc(`accounts/${uid}`).get(),
            db.collection("classes").where("accountId", "==", uid).get(),
            db.collection("activities").where("accountId", "==", uid).get(),
          ]);
          data.teacherAccount = accountSnap.exists ? accountSnap.data() : null;
          data.classes = classesSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          data.activities = activitiesSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
        } else {
          const [enrollmentsSnap, attemptsSnap, resultsSnap] =
            await Promise.all([
              db
                .collectionGroup("enrollments")
                .where("studentId", "==", uid)
                .get(),
              db.collection("attempts").where("studentId", "==", uid).get(),
              db
                .collection("attemptResults")
                .where("studentId", "==", uid)
                .get(),
            ]);

          data.enrollments = enrollmentsSnap.docs.map((d) => ({
            classId: d.ref.parent.parent?.id ?? null,
            ...d.data(),
          }));

          const attempts = [];
          for (const doc of attemptsSnap.docs) {
            const answersSnap = await doc.ref.collection("answers").get();
            attempts.push({
              id: doc.id,
              ...doc.data(),
              answers: answersSnap.docs.map((a) => ({
                itemId: a.id,
                ...a.data(),
              })),
            });
          }
          data.attempts = attempts;
          data.attemptResults = resultsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
        }

        const consentsSnap = await db
          .collection(`consents/${uid}/records`)
          .get();
        data.consents = consentsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        await logAudit(uid, "exportUserData", request.rawRequest?.ip ?? null);

        return data;
      },
    );
  },
);
