import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();
setGlobalOptions({ region: "southamerica-east1", maxInstances: 10 });

export { ping } from "./health";
export { finalizeSignup } from "./auth/finalize-signup";
export { createClass } from "./classes/create-class";

/*
 * -------------------------------------------------------------------------
 * Funções planejadas (docs/IMPLEMENTATION-PLAN.md seção 6). A implementar:
 *
 * auth/
 *   recordConsent            (embutido em finalizeSignup por enquanto)
 * classes/
 *   joinClassByCode          valida sala ativa / não-duplicidade (RN-002, RN-003)
 *   addStudentToClass        inscrição manual + criação de conta de menor (RF-007, RF-021)
 *   removeStudentFromClass   marca enrollment como REMOVED (RF-005)
 * activities/
 *   publishAssignment        valida (RN-006); congela contentSnapshot + assignmentKeys
 *   cloneActivity            duplica atividade + itens (ADR-014)
 *   swapAssignmentActivity   troca a atividade de um assignment com startedCount == 0
 *   releaseAssignmentResults liberação de resultados aos alunos (ADR-013)
 * attempts/
 *   createAttempt            RN-005 / RN-007; transação: startedCount + lock (ADR-014)
 *   submitAttempt            lê assignmentKeys, calcula score (RN-008), status GRADED
 * privacy/
 *   exportUserData / deleteUserData / purgeExpiredData (ADR-011)
 * -------------------------------------------------------------------------
 */
