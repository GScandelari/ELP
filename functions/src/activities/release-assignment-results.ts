import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { requireRole } from "../lib/require-role";
import { loadOwnedAssignment } from "./load-owned-assignment";

type Payload = {
  classId?: unknown;
  assignmentId?: unknown;
};

/**
 * Libera os resultados de um assignment para os alunos (RF-017, ADR-013).
 * Escrita única — `attemptResults` não denormaliza `resultsReleased`
 * (docs/plano-fase-4.md §2), então não há fan-out sobre as tentativas.
 */
export const releaseAssignmentResults = onCall(
  { enforceAppCheck: true },
  async (request) => {
    const uid = requireRole(
      request,
      "teacher",
      "Apenas professores podem liberar resultados.",
    );

    const data = (request.data ?? {}) as Payload;
    const classId = typeof data.classId === "string" ? data.classId : "";
    const assignmentId =
      typeof data.assignmentId === "string" ? data.assignmentId : "";
    if (!classId || !assignmentId) {
      throw new HttpsError("invalid-argument", "Sala ou atribuição inválida.");
    }

    const db = getFirestore();

    const { assignmentRef } = await loadOwnedAssignment(
      db,
      classId,
      assignmentId,
      uid,
    );

    await assignmentRef.update({
      resultsReleased: true,
      resultsReleasedAt: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  },
);
