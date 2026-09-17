import * as logger from "firebase-functions/logger";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * Logging estruturado (RNF-006, docs/plano-fase-6.md §4.4) — só usado
 * nas Cloud Functions que tratam dado sensível a LGPD (exportUserData,
 * deleteUserData, purgeExpiredData, joinClassByCode, addStudentToClass).
 * `firebase-functions/logger` já manda o log estruturado pro Cloud
 * Logging sem configuração adicional; erro vira `logger.error` com a
 * mensagem do `HttpsError` original, o que também aciona o Cloud Error
 * Reporting de graça.
 *
 * `describeResult` é opcional e só deve expor campos não sensíveis do
 * resultado (ex.: um id) — nunca o payload de dado pessoal em si.
 */
export async function withStructuredLogging<T>(
  action: string,
  context: Record<string, unknown>,
  fn: () => Promise<T>,
  describeResult?: (result: T) => Record<string, unknown>,
): Promise<T> {
  try {
    const result = await fn();
    logger.info(action, {
      ...context,
      ...(describeResult ? describeResult(result) : {}),
      result: "success",
    });
    return result;
  } catch (err) {
    logger.error(action, {
      ...context,
      result: "error",
      error: err instanceof HttpsError ? err.message : String(err),
    });
    throw err;
  }
}
