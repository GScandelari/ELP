import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { CURRENT_LEGAL_VERSION } from "../lib/legal";

type Payload = {
  name?: unknown;
  role?: unknown;
  acceptedTerms?: unknown;
  acceptedPrivacy?: unknown;
};

/**
 * Finaliza o cadastro logo após o `createUserWithEmailAndPassword` do cliente.
 * Roda com Admin SDK: define o custom claim `role`, cria `users/{uid}` (e
 * `accounts/{uid}` para professor) e registra o consentimento em
 * `consents/{uid}` — ver RF-019, ADR-011, ADR-009.
 *
 * Idempotente: se `users/{uid}` já existe, apenas retorna o papel.
 * PR 1.2 cobre apenas `role: "teacher"`; aluno chega na PR 1.3.
 */
export const finalizeSignup = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
  }

  const data = (request.data ?? {}) as Payload;
  const name = typeof data.name === "string" ? data.name.trim() : "";

  if (name.length < 2) {
    throw new HttpsError("invalid-argument", "Informe seu nome completo.");
  }
  if (data.role !== "teacher") {
    throw new HttpsError("invalid-argument", "Papel inválido.");
  }
  if (data.acceptedTerms !== true || data.acceptedPrivacy !== true) {
    throw new HttpsError(
      "failed-precondition",
      "É necessário aceitar os Termos de Uso e a Política de Privacidade.",
    );
  }

  const uid = request.auth.uid;
  const email = (request.auth.token.email as string | undefined) ?? null;
  const role = "teacher" as const;
  const db = getFirestore();
  const userRef = db.doc(`users/${uid}`);

  const existing = await userRef.get();
  if (existing.exists) {
    return { ok: true, role: existing.get("role") as string };
  }

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  batch.set(userRef, {
    name,
    email,
    role,
    status: "ACTIVE",
    isMinor: false,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(db.doc(`accounts/${uid}`), { status: "ACTIVE", createdAt: now });

  for (const type of ["TERMS", "PRIVACY_POLICY"] as const) {
    batch.set(db.collection(`consents/${uid}/records`).doc(), {
      type,
      textVersion: CURRENT_LEGAL_VERSION,
      grantedAt: now,
      grantedByRole: role,
      grantedByUid: uid,
    });
  }

  await batch.commit();
  await getAuth().setCustomUserClaims(uid, { role });

  return { ok: true, role };
});
