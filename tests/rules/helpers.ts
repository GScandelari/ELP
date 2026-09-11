import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

const here = fileURLToPath(new URL(".", import.meta.url));

/** Sobe um ambiente de teste de Security Rules contra o emulador local. */
export function createRulesTestEnv(
  projectId: string,
): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync(resolve(here, "../../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
}

/** `db(uid, claims)` — Firestore autenticado como `uid`, ou anônimo se `uid` for `null`. */
export function contextFactory(testEnv: RulesTestEnvironment) {
  return function db(uid: string | null, claims: Record<string, unknown> = {}) {
    return uid
      ? testEnv.authenticatedContext(uid, claims).firestore()
      : testEnv.unauthenticatedContext().firestore();
  };
}
