import type { Firestore } from "firebase-admin/firestore";

/** Seeds compartilhados pelos testes de integração de `activities/` — cada
 * teste passa só o que difere do caso comum via `overrides`/`options`. */

export const VALID_MC_CONFIG = {
  question: "Qual é a capital da França?",
  options: ["Londres", "Paris"],
  correctIndex: 1,
};

export async function seedClass(db: Firestore, id: string, accountId: string) {
  await db.doc(`classes/${id}`).set({
    accountId,
    name: "Inglês 6º ano",
    description: "",
    enrollmentCode: "ABC123",
    status: "ACTIVE",
    studentCount: 0,
  });
}

export async function seedActivity(
  db: Firestore,
  id: string,
  accountId: string,
  overrides: Record<string, unknown> = {},
) {
  await db.doc(`activities/${id}`).set({
    accountId,
    title: "Capitais",
    description: "",
    type: "MULTIPLE_CHOICE",
    difficulty: "EASY",
    tags: [],
    status: "READY",
    locked: false,
    itemCount: 1,
    ...overrides,
  });
}

export async function seedItem(
  db: Firestore,
  activityId: string,
  itemId: string,
  accountId: string,
  options: {
    configuration?: Record<string, unknown>;
    prompt?: string;
    points?: number;
  } = {},
) {
  await db.doc(`activities/${activityId}/items/${itemId}`).set({
    accountId,
    position: 0,
    prompt: options.prompt ?? VALID_MC_CONFIG.question,
    configuration: options.configuration ?? VALID_MC_CONFIG,
    points: options.points ?? 2,
  });
}
