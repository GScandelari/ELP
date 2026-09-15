import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createAttempt } from "../src/attempts/create-attempt";
import {
  clearFirestoreEmulator,
  cleanupTestApp,
  initTestApp,
  wrapCallable,
} from "./helpers";
import { seedActivity, seedClass, seedItem } from "./activity-fixtures";

type Payload = { classId?: unknown; assignmentId?: unknown };
type Result = { attemptId: string; status: string };

let db: Firestore;
let call: ReturnType<typeof wrapCallable<Payload, Result>>;

beforeAll(() => {
  db = initTestApp();
  call = wrapCallable(createAttempt);
});

afterAll(() => cleanupTestApp());

beforeEach(() => clearFirestoreEmulator());

const TEACHER = { uid: "prof-1", token: { role: "teacher" } };
const STUDENT = { uid: "aluno-1", token: { role: "student" } };

async function seedEnrollment(classId: string, studentId: string) {
  await db.doc(`classes/${classId}/enrollments/${studentId}`).set({
    studentId,
    accountId: TEACHER.uid,
    enrollmentType: "SELF_ENROLLMENT",
    status: "ACTIVE",
  });
}

async function seedAssignment(
  classId: string,
  assignmentId: string,
  activityId: string,
  overrides: Record<string, unknown> = {},
) {
  await db.doc(`classes/${classId}/assignments/${assignmentId}`).set({
    accountId: TEACHER.uid,
    activityId,
    activityTitle: "Capitais",
    type: "MULTIPLE_CHOICE",
    contentSnapshot: [{ itemId: "i1", prompt: "...", points: 1, content: {} }],
    status: "PUBLISHED",
    position: 0,
    maxAttempts: 1,
    startedCount: 0,
    firstStartedAt: null,
    resultsPolicy: "ON_TEACHER_RELEASE",
    resultsReleased: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

async function setup(assignmentOverrides: Record<string, unknown> = {}) {
  await seedClass(db, "c1", TEACHER.uid);
  await seedEnrollment("c1", STUDENT.uid);
  await seedActivity(db, "a1", TEACHER.uid);
  await seedItem(db, "a1", "i1", TEACHER.uid);
  await seedAssignment("c1", "asg1", "a1", assignmentOverrides);
}

describe("createAttempt (integração)", () => {
  it("rejeita chamada sem autenticação", async () => {
    await expect(
      call({ classId: "c1", assignmentId: "asg1" }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejeita quem não é aluno", async () => {
    await expect(
      call({ classId: "c1", assignmentId: "asg1" }, TEACHER),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita sala ou atividade ausente no payload", async () => {
    await expect(call({ classId: "c1" }, STUDENT)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("rejeita sala ou assignment inexistente", async () => {
    await setup();
    await expect(
      call({ classId: "nao-existe", assignmentId: "asg1" }, STUDENT),
    ).rejects.toMatchObject({ code: "not-found" });
    await expect(
      call({ classId: "c1", assignmentId: "nao-existe" }, STUDENT),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("rejeita aluno não inscrito na sala", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedActivity(db, "a1", TEACHER.uid);
    await seedItem(db, "a1", "i1", TEACHER.uid);
    await seedAssignment("c1", "asg1", "a1");
    await expect(
      call({ classId: "c1", assignmentId: "asg1" }, STUDENT),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita assignment que não está PUBLISHED (RN-005)", async () => {
    await setup({ status: "CLOSED" });
    await expect(
      call({ classId: "c1", assignmentId: "asg1" }, STUDENT),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("cria a tentativa, incrementa startedCount e trava a atividade (RN-013)", async () => {
    await setup();
    const res = await call({ classId: "c1", assignmentId: "asg1" }, STUDENT);
    expect(res.status).toBe("IN_PROGRESS");

    const attemptSnap = await db.doc(`attempts/${res.attemptId}`).get();
    const attempt = attemptSnap.data()!;
    expect(attempt.studentId).toBe(STUDENT.uid);
    expect(attempt.assignmentId).toBe("asg1");
    expect(attempt.classId).toBe("c1");
    expect(attempt.activityId).toBe("a1");
    expect(attempt.attemptNumber).toBe(1);
    expect(attempt.status).toBe("IN_PROGRESS");

    const assignmentSnap = await db.doc("classes/c1/assignments/asg1").get();
    expect(assignmentSnap.get("startedCount")).toBe(1);
    expect(assignmentSnap.get("firstStartedAt")).not.toBeNull();

    const activitySnap = await db.doc("activities/a1").get();
    expect(activitySnap.get("locked")).toBe(true);
    expect(activitySnap.get("status")).toBe("LOCKED");
  });

  it("retoma a tentativa IN_PROGRESS existente em vez de criar outra", async () => {
    await setup();
    const first = await call({ classId: "c1", assignmentId: "asg1" }, STUDENT);
    const second = await call({ classId: "c1", assignmentId: "asg1" }, STUDENT);
    expect(second.attemptId).toBe(first.attemptId);

    const assignmentSnap = await db.doc("classes/c1/assignments/asg1").get();
    expect(assignmentSnap.get("startedCount")).toBe(1); // não incrementou de novo
  });

  it("rejeita nova tentativa quando maxAttempts já foi atingido (RN-007)", async () => {
    await setup({ maxAttempts: 1 });
    await db.doc("attempts/attempt-antigo").set({
      assignmentId: "asg1",
      classId: "c1",
      activityId: "a1",
      studentId: STUDENT.uid,
      attemptNumber: 1,
      status: "GRADED",
      startedAt: new Date(),
      submittedAt: new Date(),
    });

    await expect(
      call({ classId: "c1", assignmentId: "asg1" }, STUDENT),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("não falha ao criar tentativa numa atividade já travada por outro aluno", async () => {
    await setup();
    await db
      .doc("activities/a1")
      .update({ locked: true, status: "LOCKED", lockedAt: new Date() });

    const res = await call({ classId: "c1", assignmentId: "asg1" }, STUDENT);
    expect(res.status).toBe("IN_PROGRESS");
  });
});
