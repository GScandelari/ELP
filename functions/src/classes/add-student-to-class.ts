import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { CURRENT_LEGAL_VERSION } from "../lib/legal";

type GuardianConsentPayload = {
  guardianName?: unknown;
  statementAccepted?: unknown;
};

type Payload = {
  classId?: unknown;
  studentEmail?: unknown;
  studentName?: unknown;
  isMinor?: unknown;
  guardianConsent?: GuardianConsentPayload;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Inscrição manual de um aluno (RF-007, UC manual).
 *
 * "Caso A" — o e-mail já tem conta: só confere `role == 'student'` e
 * inscreve. "Caso B" — sem conta: cria a conta (Admin SDK), e se
 * `isMinor` exige a declaração de consentimento do responsável legal
 * (RF-021, ADR-011) antes de criar qualquer coisa. Em ambos os casos o
 * professor precisa ser o dono da sala (RN-004).
 */
export const addStudentToClass = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
  }
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError(
      "permission-denied",
      "Apenas professores podem inscrever alunos.",
    );
  }

  const data = (request.data ?? {}) as Payload;
  const classId = typeof data.classId === "string" ? data.classId : "";
  const email =
    typeof data.studentEmail === "string"
      ? data.studentEmail.trim().toLowerCase()
      : "";
  const studentName =
    typeof data.studentName === "string" ? data.studentName.trim() : "";
  const isMinor = data.isMinor === true;
  const guardianConsent = data.guardianConsent ?? {};
  const guardianName =
    typeof guardianConsent.guardianName === "string"
      ? guardianConsent.guardianName.trim()
      : "";
  const guardianAccepted = guardianConsent.statementAccepted === true;

  if (!classId) {
    throw new HttpsError("invalid-argument", "Sala inválida.");
  }
  if (!EMAIL_RE.test(email)) {
    throw new HttpsError("invalid-argument", "Informe um e-mail válido.");
  }

  const uid = request.auth.uid;
  const db = getFirestore();

  const classRef = db.doc(`classes/${classId}`);
  const classSnap = await classRef.get();
  if (!classSnap.exists) {
    throw new HttpsError("not-found", "Sala não encontrada.");
  }
  if (classSnap.get("accountId") !== uid) {
    throw new HttpsError("permission-denied", "Esta sala não é sua."); // RN-004
  }

  let existingUid: string | null = null;
  try {
    existingUid = (await getAuth().getUserByEmail(email)).uid;
  } catch {
    existingUid = null; // sem conta com este e-mail -> "caso B" abaixo
  }

  let studentId: string;
  let resolvedName: string;
  let passwordSetupLink: string | undefined;

  if (existingUid) {
    // caso A — aluno já tem conta
    studentId = existingUid;
    const studentUserSnap = await db.doc(`users/${studentId}`).get();
    if (studentUserSnap.get("role") !== "student") {
      throw new HttpsError(
        "invalid-argument",
        "Este e-mail não pertence a uma conta de aluno.",
      );
    }
    resolvedName = studentUserSnap.get("name") ?? "";
  } else {
    // caso B — cria a conta; menor exige consentimento do responsável antes
    if (studentName.length < 2) {
      throw new HttpsError(
        "invalid-argument",
        "Informe o nome completo do aluno.",
      );
    }
    if (isMinor && (guardianName.length < 2 || !guardianAccepted)) {
      throw new HttpsError(
        "failed-precondition",
        "Para alunos menores de 18 anos, informe o nome do responsável " +
          "legal e confirme que obteve o consentimento dele.",
      );
    }

    const created = await getAuth().createUser({
      email,
      displayName: studentName,
    });
    studentId = created.uid;
    await getAuth().setCustomUserClaims(studentId, { role: "student" });

    const now = FieldValue.serverTimestamp();
    await db.doc(`users/${studentId}`).set({
      name: studentName,
      email,
      role: "student",
      status: "ACTIVE",
      isMinor,
      createdAt: now,
      updatedAt: now,
    });

    if (isMinor) {
      // imutável (firestore.rules: consents.write = if false) — só esta função grava
      await db.collection(`consents/${studentId}/records`).add({
        type: "GUARDIAN_CONSENT",
        textVersion: CURRENT_LEGAL_VERSION,
        grantedAt: now,
        grantedByRole: "teacher",
        grantedByUid: uid,
        guardianName,
      });
    }

    resolvedName = studentName;
    // Entrega ao aluno é manual no MVP (o professor repassa o link) — R4
    // do RIPD, risco aceito; sem SMTP integrado nesta fase.
    passwordSetupLink = await getAuth().generatePasswordResetLink(email);
  }

  const enrollmentRef = classRef.collection("enrollments").doc(studentId);

  await db.runTransaction(async (tx) => {
    const enrollmentSnap = await tx.get(enrollmentRef);
    if (enrollmentSnap.exists && enrollmentSnap.get("status") === "ACTIVE") {
      throw new HttpsError("already-exists", "Este aluno já está nesta sala.");
    }

    const now = FieldValue.serverTimestamp();
    if (enrollmentSnap.exists) {
      // reingresso (estava REMOVED): reativa em vez de duplicar
      tx.update(enrollmentRef, {
        status: "ACTIVE",
        enrollmentType: "TEACHER_ASSIGNED",
        rejoinedAt: now,
      });
    } else {
      tx.set(enrollmentRef, {
        studentId,
        accountId: uid, // denormalizado - ver docs/plano-fase-2.md §8.1
        enrollmentType: "TEACHER_ASSIGNED",
        status: "ACTIVE",
        studentName: resolvedName,
        studentEmail: email,
        createdAt: now,
      });
    }
    tx.update(classRef, {
      studentCount: FieldValue.increment(1),
      updatedAt: now,
    });
  });

  return {
    studentId,
    enrollmentType: "TEACHER_ASSIGNED" as const,
    passwordSetupLink,
  };
});
