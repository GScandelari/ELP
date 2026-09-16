import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { aggregateResultOnce } from "../src/attempts/aggregate-result";
import { clearFirestoreEmulator, cleanupTestApp, initTestApp } from "./helpers";
import { seedClass } from "./activity-fixtures";

let db: Firestore;

beforeAll(() => {
  db = initTestApp();
});

afterAll(() => cleanupTestApp());

beforeEach(() => clearFirestoreEmulator());

const TEACHER = "prof-1";
const STUDENT = "aluno-1";

async function seedAttemptResult(
  id: string,
  overrides: Record<string, unknown> = {},
) {
  await db.doc(`attemptResults/${id}`).set({
    studentId: STUDENT,
    classId: "c1",
    assignmentId: "a1",
    score: 2,
    maxScore: 2,
    items: [],
    gradedAt: new Date("2026-01-01"),
    ...overrides,
  });
}

describe("aggregateResultOnce (integração)", () => {
  it("cria o resumo com accountId denormalizado e a pontuação da tentativa", async () => {
    await seedClass(db, "c1", TEACHER);
    await seedAttemptResult("r1");

    await aggregateResultOnce("r1");

    const summary = await db.doc(`classes/c1/resultsSummary/${STUDENT}`).get();
    expect(summary.exists).toBe(true);
    expect(summary.get("accountId")).toBe(TEACHER);
    expect(summary.get("assignmentScores.a1")).toMatchObject({
      score: 2,
      maxScore: 2,
    });
  });

  it("melhor tentativa vence: não sobrescreve com uma pontuação pior", async () => {
    await seedClass(db, "c1", TEACHER);
    await seedAttemptResult("r1", { score: 2, maxScore: 2 });
    await aggregateResultOnce("r1");

    await seedAttemptResult("r2", { score: 1, maxScore: 2 });
    await aggregateResultOnce("r2");

    const summary = await db.doc(`classes/c1/resultsSummary/${STUDENT}`).get();
    expect(summary.get("assignmentScores.a1").score).toBe(2);
  });

  it("melhor tentativa vence: sobrescreve quando a nova pontuação é maior", async () => {
    await seedClass(db, "c1", TEACHER);
    await seedAttemptResult("r1", { score: 1, maxScore: 2 });
    await aggregateResultOnce("r1");

    await seedAttemptResult("r2", { score: 2, maxScore: 2 });
    await aggregateResultOnce("r2");

    const summary = await db.doc(`classes/c1/resultsSummary/${STUDENT}`).get();
    expect(summary.get("assignmentScores.a1").score).toBe(2);
  });

  it("mantém entradas de outros assignments intactas (merge, não substitui o mapa inteiro)", async () => {
    await seedClass(db, "c1", TEACHER);
    await seedAttemptResult("r1", {
      assignmentId: "a1",
      score: 2,
      maxScore: 2,
    });
    await aggregateResultOnce("r1");

    await seedAttemptResult("r2", {
      assignmentId: "a2",
      score: 3,
      maxScore: 4,
    });
    await aggregateResultOnce("r2");

    const summary = await db.doc(`classes/c1/resultsSummary/${STUDENT}`).get();
    expect(summary.get("assignmentScores.a1").score).toBe(2);
    expect(summary.get("assignmentScores.a2").score).toBe(3);
  });

  it("não faz nada se o attemptResult não existe (defensivo)", async () => {
    await expect(aggregateResultOnce("nao-existe")).resolves.toBeUndefined();
  });

  it("não faz nada se a sala do attemptResult não existe (defensivo)", async () => {
    await seedAttemptResult("r1", { classId: "sala-fantasma" });
    await expect(aggregateResultOnce("r1")).resolves.toBeUndefined();
    const summary = await db
      .doc(`classes/sala-fantasma/resultsSummary/${STUDENT}`)
      .get();
    expect(summary.exists).toBe(false);
  });
});
