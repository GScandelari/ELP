import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

/**
 * Guard comum às Cloud Functions callable que exigem um papel
 * específico (professor ou aluno) — extraído pra reduzir duplicação
 * entre as ~11 callables que repetiam exatamente essas duas checagens
 * (achado do SonarCloud depois de adicionar `enforceAppCheck` em todas
 * na PR 6.5, empurrando o bloco já duplicado acima do limiar). Devolve
 * o uid depois de confirmar autenticação + papel.
 */
export function requireRole(
  request: CallableRequest,
  role: "teacher" | "student",
  deniedMessage: string,
): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
  }
  if (request.auth.token.role !== role) {
    throw new HttpsError("permission-denied", deniedMessage);
  }
  return request.auth.uid;
}
