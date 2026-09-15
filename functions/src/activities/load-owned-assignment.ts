import type {
  DocumentReference,
  DocumentSnapshot,
  Firestore,
} from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * Carrega `classes/{classId}` e `classes/{classId}/assignments/{assignmentId}`
 * e confere posse dos dois — guard repetido por `swapAssignmentActivity` e
 * `releaseAssignmentResults` (e o mesmo formato que `publishAssignment` usa
 * para `activities`/`classes`).
 */
export async function loadOwnedAssignment(
  db: Firestore,
  classId: string,
  assignmentId: string,
  uid: string,
): Promise<{
  classRef: DocumentReference;
  assignmentRef: DocumentReference;
  classSnap: DocumentSnapshot;
  assignmentSnap: DocumentSnapshot;
}> {
  const classRef = db.doc(`classes/${classId}`);
  const assignmentRef = classRef.collection("assignments").doc(assignmentId);
  const [classSnap, assignmentSnap] = await Promise.all([
    classRef.get(),
    assignmentRef.get(),
  ]);

  if (!classSnap.exists) {
    throw new HttpsError("not-found", "Sala não encontrada.");
  }
  if (!assignmentSnap.exists) {
    throw new HttpsError("not-found", "Atribuição não encontrada.");
  }
  if (classSnap.get("accountId") !== uid) {
    throw new HttpsError("permission-denied", "Esta sala não é sua.");
  }
  if (assignmentSnap.get("accountId") !== uid) {
    throw new HttpsError("permission-denied", "Esta atribuição não é sua.");
  }

  return { classRef, assignmentRef, classSnap, assignmentSnap };
}
