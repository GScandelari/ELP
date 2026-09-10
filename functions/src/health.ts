import { onRequest } from "firebase-functions/v2/https";

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
