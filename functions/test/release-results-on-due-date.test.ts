import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { releaseResultsOnDueDateOnce } from "../src/activities/release-results-on-due-date";
import { clearFirestoreEmulator, cleanupTestApp, initTestApp } from "./helpers";
import { seedClass } from "./activity-fixtures";

let db: Firestore;

beforeAll(() => {
  db = initTestApp();
});

afterAll(() => cleanupTestApp());

beforeEach(() => clearFirestoreEmulator());

const TEACHER = "prof-1";

async function seedAssignment(
  classId: string,
  assignmentId: string,
  overrides: Record<string, unknown>,
) {
  await db.doc(`classes/${classId}/assignments/${assignmentId}`).set({
    accountId: TEACHER,
    activityId: "a1",
    activityTitle: "Capitais",
    type: "MULTIPLE_CHOICE",
    contentSnapshot: [],
    status: "PUBLISHED",
    position: 0,
    maxAttempts: 1,
    resultsPolicy: "ON_TEACHER_RELEASE",
    resultsReleased: false,
    dueDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe("releaseResultsOnDueDateOnce (integração)", () => {
  it("libera assignments ON_DUE_DATE com prazo vencido, entre salas diferentes", async () => {
    await seedClass(db, "c1", TEACHER);
    await seedClass(db, "c2", TEACHER);

    // vencido, ON_DUE_DATE -> libera
    await seedAssignment("c1", "vencido", {
      resultsPolicy: "ON_DUE_DATE",
      dueDate: "2020-01-01",
    });
    // futuro, ON_DUE_DATE -> não libera ainda
    await seedAssignment("c2", "futuro", {
      resultsPolicy: "ON_DUE_DATE",
      dueDate: "2999-01-01",
    });
    // vencido, mas política é ON_TEACHER_RELEASE -> não libera
    await seedAssignment("c1", "outra-politica", {
      resultsPolicy: "ON_TEACHER_RELEASE",
      dueDate: "2020-01-01",
    });
    // vencido e ON_DUE_DATE, mas já liberado -> não conta de novo
    await seedAssignment("c2", "ja-liberado", {
      resultsPolicy: "ON_DUE_DATE",
      dueDate: "2020-01-01",
      resultsReleased: true,
    });
    // ON_DUE_DATE sem dueDate definido -> nunca libera sozinho
    await seedAssignment("c1", "sem-prazo", {
      resultsPolicy: "ON_DUE_DATE",
      dueDate: null,
    });

    const count = await releaseResultsOnDueDateOnce();
    expect(count).toBe(1);

    expect(
      (await db.doc("classes/c1/assignments/vencido").get()).get(
        "resultsReleased",
      ),
    ).toBe(true);
    expect(
      (await db.doc("classes/c2/assignments/futuro").get()).get(
        "resultsReleased",
      ),
    ).toBe(false);
    expect(
      (await db.doc("classes/c1/assignments/outra-politica").get()).get(
        "resultsReleased",
      ),
    ).toBe(false);
    expect(
      (await db.doc("classes/c1/assignments/sem-prazo").get()).get(
        "resultsReleased",
      ),
    ).toBe(false);
  });

  it("não faz nada quando não há assignments elegíveis", async () => {
    const count = await releaseResultsOnDueDateOnce();
    expect(count).toBe(0);
  });
});
