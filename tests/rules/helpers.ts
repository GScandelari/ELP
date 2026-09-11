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

// UIDs padrão reaproveitados pelos testes de rules — um professor "dono",
// um segundo professor (tenta acessar o que não é dele), um aluno
// inscrito e um aluno de fora.
export const TEACHER = "teacher-1";
export const OTHER_TEACHER = "teacher-2";
export const STUDENT = "student-1";
export const OTHER_STUDENT = "student-2";

/** Os 4 papéis padrão, já como contexto Firestore pronto pra usar. */
export function standardActors(db: ReturnType<typeof contextFactory>) {
  return {
    teacher: () => db(TEACHER, { role: "teacher" }),
    otherTeacher: () => db(OTHER_TEACHER, { role: "teacher" }),
    student: () => db(STUDENT, { role: "student" }),
    otherStudent: () => db(OTHER_STUDENT, { role: "student" }),
  };
}
