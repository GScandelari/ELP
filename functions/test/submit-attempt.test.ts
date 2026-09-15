import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { submitAttempt } from "../src/attempts/submit-attempt";
import {
  clearFirestoreEmulator,
  cleanupTestApp,
  initTestApp,
  wrapCallable,
} from "./helpers";
import {
  VALID_MC_CONFIG,
  seedActivity,
  seedClass,
  seedItem,
} from "./activity-fixtures";

type Payload = { attemptId?: unknown; answers?: unknown };
type Result = {
  status: string;
  resultsReleased: boolean;
  score?: number;
  maxScore?: number;
};

let db: Firestore;
let call: ReturnType<typeof wrapCallable<Payload, Result>>;

beforeAll(() => {
  db = initTestApp();
  call = wrapCallable(submitAttempt);
});

afterAll(() => cleanupTestApp());

beforeEach(() => clearFirestoreEmulator());

const TEACHER = { uid: "prof-1", token: { role: "teacher" } };
const STUDENT = { uid: "aluno-1", token: { role: "student" } };
const OTHER_STUDENT = { uid: "aluno-2", token: { role: "student" } };

async function seedAssignment(resultsReleased = false) {
  await db.doc("classes/c1/assignments/asg1").set({
    accountId: TEACHER.uid,
    activityId: "a1",
    activityTitle: "Capitais",
    type: "MULTIPLE_CHOICE",
    contentSnapshot: [],
    status: "PUBLISHED",
    position: 0,
    maxAttempts: 1,
    resultsPolicy: "ON_TEACHER_RELEASE",
    resultsReleased,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.doc("assignmentKeys/asg1").set({
    classId: "c1",
    accountId: TEACHER.uid,
    gradingConfig: [
      {
        itemId: "i1",
        points: 2,
        grading: { correctIndex: VALID_MC_CONFIG.correctIndex },
      },
    ],
  });
}

async function seedAttempt(
  attemptId: string,
  overrides: Record<string, unknown> = {},
) {
  await db.doc(`attempts/${attemptId}`).set({
    assignmentId: "asg1",
    classId: "c1",
    activityId: "a1",
    studentId: STUDENT.uid,
    attemptNumber: 1,
    status: "IN_PROGRESS",
    startedAt: new Date(),
    submittedAt: null,
    ...overrides,
  });
}

async function setup(resultsReleased = false) {
  await seedClass(db, "c1", TEACHER.uid);
  await seedActivity(db, "a1", TEACHER.uid);
  await seedItem(db, "a1", "i1", TEACHER.uid);
  await seedAssignment(resultsReleased);
}

describe("submitAttempt (integração)", () => {
  it("rejeita chamada sem autenticação", async () => {
    await expect(
      call({ attemptId: "attempt-1", answers: {} }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejeita quem não é aluno", async () => {
    await expect(
      call({ attemptId: "attempt-1", answers: {} }, TEACHER),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita payload sem attemptId/answers", async () => {
    await expect(call({ answers: {} }, STUDENT)).rejects.toMatchObject({
      code: "invalid-argument",
    });
    await expect(
      call({ attemptId: "attempt-1" }, STUDENT),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("rejeita tentativa inexistente", async () => {
    await expect(
      call({ attemptId: "nao-existe", answers: {} }, STUDENT),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("rejeita tentativa de outro aluno", async () => {
    await setup();
    await seedAttempt("attempt-1");
    await expect(
      call({ attemptId: "attempt-1", answers: {} }, OTHER_STUDENT),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita tentativa que já não está IN_PROGRESS", async () => {
    await setup();
    await seedAttempt("attempt-1", { status: "GRADED" });
    await expect(
      call({ attemptId: "attempt-1", answers: {} }, STUDENT),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("corrige, grava answers sem gabarito e attemptResults com a nota", async () => {
    await setup(false);
    await seedAttempt("attempt-1");

    const res = await call(
      { attemptId: "attempt-1", answers: { i1: { selectedIndex: 1 } } },
      STUDENT,
    );
    expect(res.status).toBe("GRADED");
    expect(res.resultsReleased).toBe(false);
    expect(res.score).toBeUndefined(); // payload mínimo (RN-011/ADR-013)

    const attemptSnap = await db.doc("attempts/attempt-1").get();
    expect(attemptSnap.get("status")).toBe("GRADED");
    expect(attemptSnap.get("submittedAt")).not.toBeNull();

    const answerSnap = await db.doc("attempts/attempt-1/answers/i1").get();
    expect(answerSnap.data()).toEqual({
      answerPayload: { selectedIndex: 1 },
    });
    expect(answerSnap.data()).not.toHaveProperty("isCorrect");

    const resultSnap = await db.doc("attemptResults/attempt-1").get();
    const result = resultSnap.data()!;
    expect(result.studentId).toBe(STUDENT.uid);
    expect(result.score).toBe(2);
    expect(result.maxScore).toBe(2);
    expect(result.items).toEqual([
      { itemId: "i1", isCorrect: true, pointsAwarded: 2 },
    ]);
  });

  it("marca isCorrect false e pontuação 0 quando a resposta está errada", async () => {
    await setup(false);
    await seedAttempt("attempt-1");

    await call(
      { attemptId: "attempt-1", answers: { i1: { selectedIndex: 0 } } },
      STUDENT,
    );

    const resultSnap = await db.doc("attemptResults/attempt-1").get();
    expect(resultSnap.get("items")).toEqual([
      { itemId: "i1", isCorrect: false, pointsAwarded: 0 },
    ]);
    expect(resultSnap.get("score")).toBe(0);
  });

  it("devolve score/maxScore direto quando resultsReleased já é true", async () => {
    await setup(true);
    await seedAttempt("attempt-1");

    const res = await call(
      { attemptId: "attempt-1", answers: { i1: { selectedIndex: 1 } } },
      STUDENT,
    );
    expect(res.resultsReleased).toBe(true);
    expect(res.score).toBe(2);
    expect(res.maxScore).toBe(2);
  });
});
