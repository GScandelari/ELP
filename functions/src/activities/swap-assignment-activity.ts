import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getActivityTypeHandler } from "../activity-types";
import { freezeContent } from "./freeze-content";
import { loadOwnedAssignment } from "./load-owned-assignment";

type Payload = {
  classId?: unknown;
  assignmentId?: unknown;
  sourceActivityId?: unknown;
};

/**
 * Substitui a atividade de origem de um assignment (ADR-014 §4/§7 —
 * "Aplicar esta versão"): re-congela `contentSnapshot`/`gradingConfig` a
 * partir de `sourceActivityId` — a mesma atividade após edição no lugar,
 * ou um clone — mantendo prazo, tentativas, posição e política de
 * liberação do assignment original. Só permitido enquanto
 * `startedCount == 0` (nenhum aluno começou ainda).
 */
export const swapAssignmentActivity = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
    }
    if (request.auth.token.role !== "teacher") {
      throw new HttpsError(
        "permission-denied",
        "Apenas professores podem substituir a atividade de uma atribuição.",
      );
    }

    const data = (request.data ?? {}) as Payload;
    const classId = typeof data.classId === "string" ? data.classId : "";
    const assignmentId =
      typeof data.assignmentId === "string" ? data.assignmentId : "";
    const sourceActivityId =
      typeof data.sourceActivityId === "string" ? data.sourceActivityId : "";
    if (!classId || !assignmentId || !sourceActivityId) {
      throw new HttpsError(
        "invalid-argument",
        "Sala, atribuição ou atividade de origem inválida.",
      );
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    const { classSnap, assignmentRef, assignmentSnap } =
      await loadOwnedAssignment(db, classId, assignmentId, uid);
    const sourceActivityRef = db.doc(`activities/${sourceActivityId}`);
    const sourceActivitySnap = await sourceActivityRef.get();

    if (!sourceActivitySnap.exists) {
      throw new HttpsError("not-found", "Atividade de origem não encontrada.");
    }
    if (sourceActivitySnap.get("accountId") !== uid) {
      throw new HttpsError(
        "permission-denied",
        "Esta atividade de origem não é sua.",
      );
    }
    if ((assignmentSnap.get("startedCount") ?? 0) > 0) {
      throw new HttpsError(
        "failed-precondition",
        "Esta sala já começou a atividade — não é possível trocar a versão.",
      );
    }
    if (sourceActivitySnap.get("status") !== "READY") {
      throw new HttpsError(
        "failed-precondition",
        "Só atividades marcadas como prontas podem ser aplicadas.",
      );
    }
    if (sourceActivitySnap.get("locked") === true) {
      // defensivo — na prática a fonte é sempre a mesma atividade (após
      // edição no lugar) ou um clone, nunca a travada (ADR-014 §3/§4).
      throw new HttpsError(
        "failed-precondition",
        "Esta atividade está travada e não pode ser aplicada.",
      );
    }

    const itemsSnap = await sourceActivityRef
      .collection("items")
      .orderBy("position", "asc")
      .get();
    if (itemsSnap.empty) {
      throw new HttpsError(
        "failed-precondition",
        "A atividade de origem não tem itens.",
      );
    }

    const activityType = sourceActivitySnap.get("type");
    const handler = getActivityTypeHandler(activityType);
    const { contentSnapshot, gradingConfig } = freezeContent(
      handler,
      itemsSnap.docs,
    );

    const previousActivityId = assignmentSnap.get("activityId");
    const now = FieldValue.serverTimestamp();

    const batch = db.batch();
    batch.update(assignmentRef, {
      activityId: sourceActivityId,
      activityTitle: sourceActivitySnap.get("title") ?? "",
      type: activityType,
      contentSnapshot,
      updatedAt: now,
    });
    batch.set(db.doc(`assignmentKeys/${assignmentId}`), {
      classId,
      accountId: uid,
      gradingConfig,
    });
    if (previousActivityId && previousActivityId !== sourceActivityId) {
      // a sala não roda mais o conteúdo da atividade anterior — o índice
      // reverso dela não deve mais listar esta sala.
      batch.delete(
        db.doc(`activities/${previousActivityId}/assignmentRefs/${classId}`),
      );
    }
    batch.set(
      db.doc(`activities/${sourceActivityId}/assignmentRefs/${classId}`),
      {
        accountId: uid,
        classId,
        className: classSnap.get("name") ?? "",
        assignmentId,
        status: assignmentSnap.get("status") ?? "PUBLISHED",
        startedCount: 0,
      },
    );
    await batch.commit();

    return { ok: true };
  },
);
