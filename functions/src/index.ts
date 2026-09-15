import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();
setGlobalOptions({ region: "southamerica-east1", maxInstances: 10 });

export { ping } from "./health";
export { finalizeSignup } from "./auth/finalize-signup";
export { createClass } from "./classes/create-class";
export { joinClassByCode } from "./classes/join-class-by-code";
export { addStudentToClass } from "./classes/add-student-to-class";
export { removeStudentFromClass } from "./classes/remove-student-from-class";
export { rotateEnrollmentCode } from "./classes/rotate-enrollment-code";
export { publishAssignment } from "./activities/publish-assignment";
export { cloneActivity } from "./activities/clone-activity";
export { swapAssignmentActivity } from "./activities/swap-assignment-activity";

/*
 * -------------------------------------------------------------------------
 * Funções planejadas (docs/IMPLEMENTATION-PLAN.md seção 6). A implementar:
 *
 * auth/
 *   recordConsent            (embutido em finalizeSignup por enquanto)
 * activities/
 *   releaseAssignmentResults liberação de resultados aos alunos (ADR-013)
 * attempts/
 *   createAttempt            RN-005 / RN-007; transação: startedCount + lock (ADR-014)
 *   submitAttempt            lê assignmentKeys, calcula score (RN-008), status GRADED
 * privacy/
 *   exportUserData / deleteUserData / purgeExpiredData (ADR-011)
 * -------------------------------------------------------------------------
 */
