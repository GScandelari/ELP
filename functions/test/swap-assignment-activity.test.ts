import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { swapAssignmentActivity } from "../src/activities/swap-assignment-activity";
import {
  clearFirestoreEmulator,
  cleanupTestApp,
  initTestApp,
  wrapCallable,
} from "./helpers";
import { seedActivity, seedClass, seedItem } from "./activity-fixtures";

type Payload = {
  classId?: unknown;
  assignmentId?: unknown;
  sourceActivityId?: unknown;
};
type Result = { ok: boolean };

let db: Firestore;
let call: ReturnType<typeof wrapCallable<Payload, Result>>;

beforeAll(() => {
  db = initTestApp();
  call = wrapCallable(swapAssignmentActivity);
});

afterAll(() => cleanupTestApp());

beforeEach(() => clearFirestoreEmulator());

const TEACHER = { uid: "prof-1", token: { role: "teacher" } };
const OTHER_TEACHER = { uid: "prof-2", token: { role: "teacher" } };

const VALID_DE_CONFIG = {
  question: "Qual é a capital da Alemanha?",
  options: ["Berlim", "Munique"],
  correctIndex: 0,
};

async function seedNewVersionActivity(
  id: string,
  accountId: string,
  activityOverrides: Record<string, unknown> = {},
  itemOptions: Parameters<typeof seedItem>[4] = {},
) {
  await seedActivity(db, id, accountId, {
    title: "Capitais (v2)",
    ...activityOverrides,
  });
  await seedItem(db, id, "i1", accountId, {
    configuration: VALID_DE_CONFIG,
    prompt: VALID_DE_CONFIG.question,
    points: 3,
    ...itemOptions,
  });
}

async function seedAssignment(
  classId: string,
  assignmentId: string,
  accountId: string,
  overrides: Record<string, unknown> = {},
) {
  await db.doc(`classes/${classId}/assignments/${assignmentId}`).set({
    accountId,
    activityId: "a1",
    activityTitle: "Capitais",
    type: "MULTIPLE_CHOICE",
    contentSnapshot: [
      { itemId: "old", prompt: "velho", points: 2, content: {} },
    ],
    status: "PUBLISHED",
    position: 0,
    publishedAt: "2026-01-01T00:00:00.000Z",
    dueDate: "2026-02-01",
    allowRetry: true,
    maxAttempts: 3,
    startedCount: 0,
    firstStartedAt: null,
    resultsPolicy: "ON_TEACHER_RELEASE",
    resultsReleased: false,
    resultsReleasedAt: null,
    ...overrides,
  });
}

describe("swapAssignmentActivity (integração)", () => {
  it("rejeita chamada sem autenticação", async () => {
    await expect(
      call({ classId: "c1", assignmentId: "asg1", sourceActivityId: "a2" }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejeita quem não é professor", async () => {
    await expect(
      call(
        { classId: "c1", assignmentId: "asg1", sourceActivityId: "a2" },
        { uid: "aluno-1", token: { role: "student" } },
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita payload incompleto", async () => {
    await expect(
      call({ classId: "c1", assignmentId: "asg1" }, TEACHER),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("rejeita sala, atribuição ou atividade de origem inexistente", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedNewVersionActivity("a2", TEACHER.uid);
    await seedAssignment("c1", "asg1", TEACHER.uid);

    await expect(
      call(
        { classId: "nao-existe", assignmentId: "asg1", sourceActivityId: "a2" },
        TEACHER,
      ),
    ).rejects.toMatchObject({ code: "not-found" });
    await expect(
      call(
        { classId: "c1", assignmentId: "nao-existe", sourceActivityId: "a2" },
        TEACHER,
      ),
    ).rejects.toMatchObject({ code: "not-found" });
    await expect(
      call(
        { classId: "c1", assignmentId: "asg1", sourceActivityId: "nao-existe" },
        TEACHER,
      ),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("rejeita sala/atribuição/origem de outro professor", async () => {
    await seedClass(db, "c1", OTHER_TEACHER.uid);
    await seedNewVersionActivity("a2", TEACHER.uid);
    await seedAssignment("c1", "asg1", OTHER_TEACHER.uid);

    await expect(
      call(
        { classId: "c1", assignmentId: "asg1", sourceActivityId: "a2" },
        TEACHER,
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita quando a sala já começou (startedCount > 0)", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedNewVersionActivity("a2", TEACHER.uid);
    await seedAssignment("c1", "asg1", TEACHER.uid, { startedCount: 1 });

    await expect(
      call(
        { classId: "c1", assignmentId: "asg1", sourceActivityId: "a2" },
        TEACHER,
      ),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("rejeita atividade de origem que não está READY", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedNewVersionActivity("a2", TEACHER.uid, { status: "DRAFT" });
    await seedAssignment("c1", "asg1", TEACHER.uid);

    await expect(
      call(
        { classId: "c1", assignmentId: "asg1", sourceActivityId: "a2" },
        TEACHER,
      ),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("rejeita atividade de origem travada (defensivo)", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedNewVersionActivity("a2", TEACHER.uid, { locked: true });
    await seedAssignment("c1", "asg1", TEACHER.uid);

    await expect(
      call(
        { classId: "c1", assignmentId: "asg1", sourceActivityId: "a2" },
        TEACHER,
      ),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("rejeita atividade de origem sem itens", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedActivity(db, "a2", TEACHER.uid, { title: "Capitais (v2)" });
    await seedAssignment("c1", "asg1", TEACHER.uid);

    await expect(
      call(
        { classId: "c1", assignmentId: "asg1", sourceActivityId: "a2" },
        TEACHER,
      ),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("rejeita item com configuração inválida (RN-006)", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedNewVersionActivity(
      "a2",
      TEACHER.uid,
      {},
      {
        configuration: { question: "Oi", options: ["Só uma"], correctIndex: 0 },
      },
    );
    await seedAssignment("c1", "asg1", TEACHER.uid);

    await expect(
      call(
        { classId: "c1", assignmentId: "asg1", sourceActivityId: "a2" },
        TEACHER,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("re-congela contentSnapshot/gradingConfig mantendo o resto do assignment", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedActivity(db, "a1", TEACHER.uid); // versão antiga (fonte original do assignment)
    await seedNewVersionActivity("a2", TEACHER.uid); // versão nova
    await seedAssignment("c1", "asg1", TEACHER.uid);
    // índice reverso da versão antiga, que deve sumir após a troca
    await db.doc("activities/a1/assignmentRefs/c1").set({
      accountId: TEACHER.uid,
      classId: "c1",
      className: "Inglês 6º ano",
      assignmentId: "asg1",
      status: "PUBLISHED",
      startedCount: 0,
    });

    const res = await call(
      { classId: "c1", assignmentId: "asg1", sourceActivityId: "a2" },
      TEACHER,
    );
    expect(res.ok).toBe(true);

    const assignmentSnap = await db.doc("classes/c1/assignments/asg1").get();
    const assignment = assignmentSnap.data()!;
    expect(assignment.activityId).toBe("a2");
    expect(assignment.activityTitle).toBe("Capitais (v2)");
    expect(assignment.contentSnapshot).toEqual([
      {
        itemId: "i1",
        prompt: VALID_DE_CONFIG.question,
        points: 3,
        content: {
          question: VALID_DE_CONFIG.question,
          options: VALID_DE_CONFIG.options,
        },
      },
    ]);
    // preservado do assignment original
    expect(assignment.dueDate).toBe("2026-02-01");
    expect(assignment.allowRetry).toBe(true);
    expect(assignment.maxAttempts).toBe(3);
    expect(assignment.position).toBe(0);
    expect(assignment.resultsPolicy).toBe("ON_TEACHER_RELEASE");
    expect(assignment.status).toBe("PUBLISHED");

    const keysSnap = await db.doc("assignmentKeys/asg1").get();
    expect(keysSnap.data()!.gradingConfig).toEqual([
      { itemId: "i1", points: 3, grading: { correctIndex: 0 } },
    ]);

    // índice reverso: some da atividade antiga, aparece na nova
    const oldRef = await db.doc("activities/a1/assignmentRefs/c1").get();
    expect(oldRef.exists).toBe(false);
    const newRef = await db.doc("activities/a2/assignmentRefs/c1").get();
    expect(newRef.exists).toBe(true);
    expect(newRef.get("assignmentId")).toBe("asg1");
  });
});
