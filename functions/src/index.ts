import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";

initializeApp();

setGlobalOptions({ region: "southamerica-east1", maxInstances: 10 });

/**
 * Health check — usado no critério de saída da Fase 0.
 * Emulador: GET http://127.0.0.1:5001/<project>/southamerica-east1/ping
 */
export const ping = onRequest((_req, res) => {
  res.json({
    status: "ok",
    service: "elp-functions",
    time: new Date().toISOString(),
  });
});

/*
 * -------------------------------------------------------------------------
 * Funções planejadas (docs/IMPLEMENTATION-PLAN.md seção 6). A implementar:
 *
 * auth/
 *   onUserCreate             espelha `role` como custom claim, cria users/{uid}
 *   recordConsent            grava consents/{uid} no aceite (RF-019)
 * classes/
 *   createClass              código único via transação (RN-001)
 *   joinClassByCode          valida sala ativa / não-duplicidade (RN-002, RN-003)
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
