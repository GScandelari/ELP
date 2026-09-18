import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { requireRole } from "../lib/require-role";
import { getActivityTypeHandler } from "../activity-types";
import { freezeContent } from "./freeze-content";

type Payload = {
  classId?: unknown;
  activityId?: unknown;
  dueDate?: unknown;
  maxAttempts?: unknown;
  allowRetry?: unknown;
  resultsPolicy?: unknown;
};

const MAX_ATTEMPTS_CAP = 20;

const RESULTS_POLICIES = ["ON_TEACHER_RELEASE", "ON_DUE_DATE", "ON_CLOSE"];

/**
 * Atribui uma atividade `READY` a uma sala (RF-011, RN-006, RN-012, UC-005).
 *
 * Congela `contentSnapshot` (sem gabarito) e `assignmentKeys.gradingConfig`
 * (gabarito) na MESMA chamada de cada `handler`, nunca em passos separados
 * (docs/plano-fase-3.md §10 — evita os dois divergirem entre si). Pode ser
 * chamada de novo para outra sala com a mesma atividade (RN-012) — cada
 * chamada gera um `assignmentId` novo.
 *
 * `resultsPolicy` (ADR-013 §2) — default `ON_TEACHER_RELEASE` quando o
 * client não manda nada. `ON_DUE_DATE` exige `dueDate` definido (sem
 * prazo, não há quando liberar automaticamente).
 */
export const publishAssignment = onCall(
  { enforceAppCheck: true },
  async (request) => {
    const uid = requireRole(
      request,
      "teacher",
      "Apenas professores podem atribuir atividades.",
    );

    const data = (request.data ?? {}) as Payload;
    const classId = typeof data.classId === "string" ? data.classId : "";
    const activityId =
      typeof data.activityId === "string" ? data.activityId : "";
    if (!classId || !activityId) {
      throw new HttpsError("invalid-argument", "Sala ou atividade inválida.");
    }

    const maxAttempts =
      data.maxAttempts === undefined || data.maxAttempts === null
        ? 1
        : Number(data.maxAttempts);
    if (
      !Number.isInteger(maxAttempts) ||
      maxAttempts < 1 ||
      maxAttempts > MAX_ATTEMPTS_CAP
    ) {
      throw new HttpsError(
        "invalid-argument",
        `O número de tentativas deve ser entre 1 e ${MAX_ATTEMPTS_CAP}.`,
      );
    }
    const allowRetry = data.allowRetry === true;

    let dueDate: string | null = null;
    if (
      data.dueDate !== undefined &&
      data.dueDate !== null &&
      data.dueDate !== ""
    ) {
      if (
        typeof data.dueDate !== "string" ||
        Number.isNaN(Date.parse(data.dueDate))
      ) {
        throw new HttpsError("invalid-argument", "Data limite inválida.");
      }
      dueDate = data.dueDate;
    }

    const resultsPolicy =
      data.resultsPolicy === undefined || data.resultsPolicy === null
        ? "ON_TEACHER_RELEASE"
        : data.resultsPolicy;
    if (
      typeof resultsPolicy !== "string" ||
      !RESULTS_POLICIES.includes(resultsPolicy)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Política de resultados inválida.",
      );
    }
    if (resultsPolicy === "ON_DUE_DATE" && !dueDate) {
      throw new HttpsError(
        "invalid-argument",
        "Defina uma data limite para liberar os resultados automaticamente nela.",
      );
    }

    const db = getFirestore();

    const activityRef = db.doc(`activities/${activityId}`);
    const classRef = db.doc(`classes/${classId}`);
    const [activitySnap, classSnap] = await Promise.all([
      activityRef.get(),
      classRef.get(),
    ]);

    if (!activitySnap.exists) {
      throw new HttpsError("not-found", "Atividade não encontrada.");
    }
    if (!classSnap.exists) {
      throw new HttpsError("not-found", "Sala não encontrada.");
    }
    if (activitySnap.get("accountId") !== uid) {
      throw new HttpsError("permission-denied", "Esta atividade não é sua.");
    }
    if (classSnap.get("accountId") !== uid) {
      throw new HttpsError("permission-denied", "Esta sala não é sua.");
    }
    if (activitySnap.get("status") !== "READY") {
      throw new HttpsError(
        "failed-precondition",
        "Só atividades marcadas como prontas podem ser atribuídas.",
      );
    }
    if (activitySnap.get("locked") === true) {
      // RN-013 — defensivo: no modelo atual status LOCKED já implica isso,
      // mas o guard explícito documenta a regra sem depender dessa premissa.
      throw new HttpsError(
        "failed-precondition",
        "Esta atividade já foi travada e não pode ser atribuída.",
      );
    }

    const itemsSnap = await activityRef
      .collection("items")
      .orderBy("position", "asc")
      .get();
    if (itemsSnap.empty) {
      throw new HttpsError(
        "failed-precondition",
        "Adicione pelo menos um item antes de atribuir esta atividade.",
      );
    }

    const activityType = activitySnap.get("type");
    const handler = getActivityTypeHandler(activityType);
    const { contentSnapshot, gradingConfig } = freezeContent(
      handler,
      itemsSnap.docs,
    );

    const existingAssignmentsSnap = await classRef
      .collection("assignments")
      .get();
    const position = existingAssignmentsSnap.size;

    const now = FieldValue.serverTimestamp();
    const assignmentRef = classRef.collection("assignments").doc();

    const batch = db.batch();
    batch.set(assignmentRef, {
      accountId: uid,
      activityId,
      activityTitle: activitySnap.get("title") ?? "",
      type: activityType,
      contentSnapshot,
      status: "PUBLISHED",
      position,
      publishedAt: now,
      dueDate,
      allowRetry,
      maxAttempts,
      startedCount: 0,
      firstStartedAt: null,
      resultsPolicy,
      resultsReleased: false,
      resultsReleasedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(db.doc(`assignmentKeys/${assignmentRef.id}`), {
      classId,
      accountId: uid,
      gradingConfig,
    });
    batch.set(activityRef.collection("assignmentRefs").doc(classId), {
      accountId: uid,
      classId,
      className: classSnap.get("name") ?? "",
      assignmentId: assignmentRef.id,
      status: "PUBLISHED",
      startedCount: 0,
    });
    await batch.commit();

    return { assignmentId: assignmentRef.id };
  },
);
