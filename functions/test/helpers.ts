import { initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import functionsTest from "firebase-functions-test";

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
