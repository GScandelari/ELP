import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import functionsTest from "firebase-functions-test";
import { expect, it } from "vitest";

export const PROJECT_ID = "demo-elp";

const fft = functionsTest();
let db: Firestore | null = null;

/** `initializeApp` é idempotente por processo — chame uma vez por `beforeAll`. */
export function initTestApp(): Firestore {
  if (!db) {
    initializeApp({ projectId: PROJECT_ID });
    db = getFirestore();
  }
  return db;
}

export function cleanupTestApp() {
  return fft.cleanup();
}

export async function clearFirestoreEmulator() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  await fetch(
    `http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}

export async function clearAuthEmulator() {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  await fetch(`http://${host}/emulator/v1/projects/${PROJECT_ID}/accounts`, {
    method: "DELETE",
  });
}

type CallableAuth = { uid: string; token?: Record<string, unknown> };

/** Envolve um callable v2 (`firebase-functions-test`) num `call(data, auth)` simples. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrapCallable<TData, TResult>(fn: any) {
  const wrapped = fft.wrap(fn);
  return (data: TData, auth?: CallableAuth): Promise<TResult> =>
    wrapped({ data, auth });
}

/** Cria um usuário no emulador de Auth — usado por qualquer teste que precise de um uid real (ex.: `getAuth().deleteUser`). */
export async function seedAuthUser(uid: string, email: string) {
  await getAuth().createUser({ uid, email, password: "senha123456" });
}

/**
 * Os dois casos "de guarda" que toda callable sem payload próprio
 * repete (`exportUserData`/`deleteUserData`, Fase 6): sem autenticação
 * e conta inexistente. Compartilhado pelos dois specs em vez de
 * duplicar o mesmo par de `it()`.
 *
 * Recebe um *getter* (`() => call`), não o `call` em si — a chamada a
 * esta função acontece na fase de coleta do describe, antes do
 * `beforeAll` atribuir a variável de verdade; um getter resolve o
 * valor na hora de rodar o teste, não na hora de montar a suíte.
 */
export function itRejectsWithoutAuthOrAccount<TResult>(
  getCall: () => (data: undefined, auth?: CallableAuth) => Promise<TResult>,
) {
  it("rejeita chamada sem autenticação", async () => {
    await expect(getCall()(undefined)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejeita conta inexistente", async () => {
    await seedAuthUser("fantasma", "fantasma@example.com");
    await expect(
      getCall()(undefined, { uid: "fantasma", token: { role: "student" } }),
    ).rejects.toMatchObject({ code: "not-found" });
  });
}
