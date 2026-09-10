import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-elp-rules",
    firestore: {
      rules: readFileSync(resolve(here, "../../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("firestore.rules — smoke (ADR-005/011/012/013)", () => {
  it("nega leitura de activities para não autenticado", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "activities/a1")));
  });

  it("nega leitura de assignmentKeys para um professor", async () => {
    const teacher = testEnv
      .authenticatedContext("t1", { role: "teacher" })
      .firestore();
    await assertFails(getDoc(doc(teacher, "assignmentKeys/k1")));
  });

  it("nega ao cliente criar users/{uid} diretamente (só via Cloud Function)", async () => {
    const u = testEnv.authenticatedContext("u1").firestore();
    await assertFails(
      setDoc(doc(u, "users/u1"), {
        name: "U",
        email: "u@example.com",
        role: "teacher",
      }),
    );
  });

  it("permite ao usuário ler o próprio users/{uid} e nega o de outro", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/u1"), { name: "U", role: "teacher" });
      await setDoc(doc(ctx.firestore(), "users/u2"), { name: "V", role: "student" });
    });
    const u1 = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(getDoc(doc(u1, "users/u1")));
    await assertFails(getDoc(doc(u1, "users/u2")));
  });

  it("nega ao cliente escrever em consents/{uid}/records", async () => {
    const u = testEnv.authenticatedContext("u1").firestore();
    await assertFails(
      setDoc(doc(u, "consents/u1/records/r1"), { type: "TERMS" }),
    );
  });

  it("nega ao cliente escrever em accounts/{id}", async () => {
    const u = testEnv.authenticatedContext("u1", { role: "teacher" }).firestore();
    await assertFails(setDoc(doc(u, "accounts/u1"), { status: "ACTIVE" }));
  });
});
