import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { releaseAssignmentResults } from "../src/activities/release-assignment-results";
import {
  clearFirestoreEmulator,
  cleanupTestApp,
  initTestApp,
  wrapCallable,
} from "./helpers";
import { seedClass } from "./activity-fixtures";

type Payload = { classId?: unknown; assignmentId?: unknown };
type Result = { ok: boolean };

let db: Firestore;
let call: ReturnType<typeof wrapCallable<Payload, Result>>;

beforeAll(() => {
  db = initTestApp();
  call = wrapCallable(releaseAssignmentResults);
});

afterAll(() => cleanupTestApp());

beforeEach(() => clearFirestoreEmulator());

const TEACHER = { uid: "prof-1", token: { role: "teacher" } };
const OTHER_TEACHER = { uid: "prof-2", token: { role: "teacher" } };

async function seedAssignment(accountId: string) {
  await db.doc("classes/c1/assignments/asg1").set({
    accountId,
    activityId: "a1",
    activityTitle: "Capitais",
    type: "MULTIPLE_CHOICE",
    contentSnapshot: [],
    status: "PUBLISHED",
    position: 0,
    maxAttempts: 1,
    resultsPolicy: "ON_TEACHER_RELEASE",
    resultsReleased: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("releaseAssignmentResults (integração)", () => {
  it("rejeita chamada sem autenticação", async () => {
    await expect(
      call({ classId: "c1", assignmentId: "asg1" }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejeita quem não é professor", async () => {
    await expect(
      call(
        { classId: "c1", assignmentId: "asg1" },
        { uid: "aluno-1", token: { role: "student" } },
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita sala ou atribuição ausente no payload", async () => {
    await expect(call({ classId: "c1" }, TEACHER)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("rejeita sala ou assignment inexistente", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await expect(
      call({ classId: "nao-existe", assignmentId: "asg1" }, TEACHER),
    ).rejects.toMatchObject({ code: "not-found" });
    await expect(
      call({ classId: "c1", assignmentId: "nao-existe" }, TEACHER),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("rejeita professor que não é dono", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedAssignment(TEACHER.uid);
    await expect(
      call({ classId: "c1", assignmentId: "asg1" }, OTHER_TEACHER),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("libera os resultados", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedAssignment(TEACHER.uid);

    const res = await call({ classId: "c1", assignmentId: "asg1" }, TEACHER);
    expect(res.ok).toBe(true);

    const snap = await db.doc("classes/c1/assignments/asg1").get();
    expect(snap.get("resultsReleased")).toBe(true);
    expect(snap.get("resultsReleasedAt")).not.toBeNull();
  });
});
