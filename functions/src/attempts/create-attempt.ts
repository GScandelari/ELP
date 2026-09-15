import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

type Payload = {
  classId?: unknown;
  assignmentId?: unknown;
};

/**
 * Cria ou recupera a tentativa do aluno para um assignment (UC-006 passo
 * 3, RF-012). Se já existir uma tentativa `IN_PROGRESS`, devolve ela em
 * vez de criar outra (retomar). Senão, valida `maxAttempts` (RN-007) e
 * cria uma nova — e, sendo a primeira tentativa de qualquer aluno nesta
 * atividade, trava a atividade no repositório (RN-013, ADR-014): esta é
 * a única Cloud Function que escreve `activities/{id}.locked`.
 */
export const createAttempt = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
  }
  if (request.auth.token.role !== "student") {
    throw new HttpsError(
      "permission-denied",
      "Apenas alunos podem iniciar uma atividade.",
    );
  }

  const data = (request.data ?? {}) as Payload;
  const classId = typeof data.classId === "string" ? data.classId : "";
  const assignmentId =
    typeof data.assignmentId === "string" ? data.assignmentId : "";
  if (!classId || !assignmentId) {
    throw new HttpsError("invalid-argument", "Sala ou atividade inválida.");
  }

  const uid = request.auth.uid;
  const db = getFirestore();

  const classRef = db.doc(`classes/${classId}`);
  const assignmentRef = classRef.collection("assignments").doc(assignmentId);
  const enrollmentRef = classRef.collection("enrollments").doc(uid);
  const [classSnap, assignmentSnap, enrollmentSnap] = await Promise.all([
    classRef.get(),
    assignmentRef.get(),
    enrollmentRef.get(),
  ]);

  if (!classSnap.exists) {
    throw new HttpsError("not-found", "Sala não encontrada.");
  }
  if (!assignmentSnap.exists) {
    throw new HttpsError("not-found", "Atividade não encontrada.");
  }
  if (!enrollmentSnap.exists || enrollmentSnap.get("status") !== "ACTIVE") {
    throw new HttpsError(
      "permission-denied",
      "Você não está inscrito nesta sala.",
    );
  }
  if (assignmentSnap.get("status") !== "PUBLISHED") {
    throw new HttpsError(
      "failed-precondition",
      "Esta atividade não está disponível no momento.", // RN-005
    );
  }

  const activityId = assignmentSnap.get("activityId");
  const maxAttempts = assignmentSnap.get("maxAttempts") ?? 1;

  const existingSnap = await db
    .collection("attempts")
    .where("studentId", "==", uid)
    .where("assignmentId", "==", assignmentId)
    .get();

  const inProgress = existingSnap.docs.find(
    (d) => d.get("status") === "IN_PROGRESS",
  );
  if (inProgress) {
    return { attemptId: inProgress.id, status: "IN_PROGRESS" };
  }

  const completedCount = existingSnap.docs.filter(
    (d) => d.get("status") !== "IN_PROGRESS",
  ).length;
  if (completedCount >= maxAttempts) {
    throw new HttpsError(
      "failed-precondition",
      "Você já usou todas as tentativas permitidas para esta atividade.", // RN-007
    );
  }

  const attemptRef = db.collection("attempts").doc();
  const activityRef = db.doc(`activities/${activityId}`);
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const [freshAssignmentSnap, freshActivitySnap] = await Promise.all([
      tx.get(assignmentRef),
      tx.get(activityRef),
    ]);

    tx.set(attemptRef, {
      assignmentId,
      classId,
      activityId,
      studentId: uid,
      attemptNumber: completedCount + 1,
      status: "IN_PROGRESS",
      startedAt: now,
      submittedAt: null,
    });

    const assignmentUpdate: Record<string, unknown> = {
      startedCount: FieldValue.increment(1),
      updatedAt: now,
    };
    if ((freshAssignmentSnap.get("startedCount") ?? 0) === 0) {
      assignmentUpdate.firstStartedAt = now;
    }
    tx.update(assignmentRef, assignmentUpdate);

    if (freshActivitySnap.exists && freshActivitySnap.get("locked") !== true) {
      tx.update(activityRef, {
        locked: true,
        status: "LOCKED",
        lockedAt: now,
        updatedAt: now,
      });
    }
  });

  return { attemptId: attemptRef.id, status: "IN_PROGRESS" };
});
