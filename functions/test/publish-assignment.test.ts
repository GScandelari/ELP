import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { publishAssignment } from "../src/activities/publish-assignment";
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

type Payload = {
  classId?: unknown;
  activityId?: unknown;
  dueDate?: unknown;
  maxAttempts?: unknown;
  allowRetry?: unknown;
};

type Result = { assignmentId: string };

let db: Firestore;
let call: ReturnType<typeof wrapCallable<Payload, Result>>;

beforeAll(() => {
  db = initTestApp();
  call = wrapCallable(publishAssignment);
});

afterAll(() => cleanupTestApp());

beforeEach(() => clearFirestoreEmulator());

const TEACHER = { uid: "prof-1", token: { role: "teacher" } };
const OTHER_TEACHER = { uid: "prof-2", token: { role: "teacher" } };

async function setup() {
  await seedClass(db, "c1", TEACHER.uid);
  await seedActivity(db, "a1", TEACHER.uid);
  await seedItem(db, "a1", "i1", TEACHER.uid);
}

describe("publishAssignment (integração)", () => {
  it("rejeita chamada sem autenticação", async () => {
    await expect(
      call({ classId: "c1", activityId: "a1" }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejeita quem não é professor", async () => {
    await expect(
      call(
        { classId: "c1", activityId: "a1" },
        { uid: "aluno-1", token: { role: "student" } },
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita sala ou atividade ausente no payload", async () => {
    await expect(call({ classId: "c1" }, TEACHER)).rejects.toMatchObject({
      code: "invalid-argument",
    });
    await expect(call({ activityId: "a1" }, TEACHER)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("rejeita maxAttempts inválido", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedActivity(db, "a1", TEACHER.uid);
    await seedItem(db, "a1", "i1", TEACHER.uid);

    await expect(
      call({ classId: "c1", activityId: "a1", maxAttempts: 0 }, TEACHER),
    ).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(
      call({ classId: "c1", activityId: "a1", maxAttempts: 1.5 }, TEACHER),
    ).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(
      call({ classId: "c1", activityId: "a1", maxAttempts: 999 }, TEACHER),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("rejeita dueDate inválida", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedActivity(db, "a1", TEACHER.uid);
    await seedItem(db, "a1", "i1", TEACHER.uid);

    await expect(
      call(
        { classId: "c1", activityId: "a1", dueDate: "não é uma data" },
        TEACHER,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("rejeita atividade inexistente", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await expect(
      call({ classId: "c1", activityId: "nao-existe" }, TEACHER),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("rejeita resultsPolicy inválida", async () => {
    await setup();

    await expect(
      call(
        { classId: "c1", activityId: "a1", resultsPolicy: "QUALQUER_COISA" },
        TEACHER,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("rejeita ON_DUE_DATE sem dueDate (ADR-013 §2)", async () => {
    await setup();

    await expect(
      call(
        { classId: "c1", activityId: "a1", resultsPolicy: "ON_DUE_DATE" },
        TEACHER,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("aceita resultsPolicy explícita (ON_CLOSE) e grava no assignment", async () => {
    await setup();

    const res = await call(
      { classId: "c1", activityId: "a1", resultsPolicy: "ON_CLOSE" },
      TEACHER,
    );
    const snap = await db
      .doc(`classes/c1/assignments/${res.assignmentId}`)
      .get();
    expect(snap.get("resultsPolicy")).toBe("ON_CLOSE");
  });

  it("rejeita sala inexistente", async () => {
    await seedActivity(db, "a1", TEACHER.uid);
    await seedItem(db, "a1", "i1", TEACHER.uid);
    await expect(
      call({ classId: "nao-existe", activityId: "a1" }, TEACHER),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("rejeita atividade de outro professor", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedActivity(db, "a1", OTHER_TEACHER.uid);
    await seedItem(db, "a1", "i1", OTHER_TEACHER.uid);
    await expect(
      call({ classId: "c1", activityId: "a1" }, TEACHER),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita sala de outro professor", async () => {
    await seedClass(db, "c1", OTHER_TEACHER.uid);
    await seedActivity(db, "a1", TEACHER.uid);
    await seedItem(db, "a1", "i1", TEACHER.uid);
    await expect(
      call({ classId: "c1", activityId: "a1" }, TEACHER),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita atividade que não está READY", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedActivity(db, "a1", TEACHER.uid, { status: "DRAFT" });
    await seedItem(db, "a1", "i1", TEACHER.uid);
    await expect(
      call({ classId: "c1", activityId: "a1" }, TEACHER),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("rejeita atividade travada (defensivo, RN-013)", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedActivity(db, "a1", TEACHER.uid, { locked: true });
    await seedItem(db, "a1", "i1", TEACHER.uid);
    await expect(
      call({ classId: "c1", activityId: "a1" }, TEACHER),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("rejeita atividade sem itens", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedActivity(db, "a1", TEACHER.uid);
    await expect(
      call({ classId: "c1", activityId: "a1" }, TEACHER),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("rejeita item com configuração inválida (RN-006)", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedActivity(db, "a1", TEACHER.uid);
    await seedItem(db, "a1", "i1", TEACHER.uid, {
      configuration: { question: "Oi", options: ["Só uma"], correctIndex: 0 },
    });
    await expect(
      call({ classId: "c1", activityId: "a1" }, TEACHER),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("publica e congela contentSnapshot sem gabarito + assignmentKeys com gabarito", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedActivity(db, "a1", TEACHER.uid);
    await seedItem(db, "a1", "i1", TEACHER.uid);

    const res = await call(
      { classId: "c1", activityId: "a1", maxAttempts: 3, allowRetry: true },
      TEACHER,
    );
    expect(res.assignmentId).toBeTruthy();

    const assignmentSnap = await db
      .doc(`classes/c1/assignments/${res.assignmentId}`)
      .get();
    const assignment = assignmentSnap.data()!;
    expect(assignment.status).toBe("PUBLISHED");
    expect(assignment.activityId).toBe("a1");
    expect(assignment.activityTitle).toBe("Capitais");
    expect(assignment.maxAttempts).toBe(3);
    expect(assignment.allowRetry).toBe(true);
    expect(assignment.resultsPolicy).toBe("ON_TEACHER_RELEASE");
    expect(assignment.contentSnapshot).toHaveLength(1);
    expect(assignment.contentSnapshot[0].content).toEqual({
      question: VALID_MC_CONFIG.question,
      options: VALID_MC_CONFIG.options,
    });
    expect(assignment.contentSnapshot[0].content).not.toHaveProperty(
      "correctIndex",
    );

    const keysSnap = await db.doc(`assignmentKeys/${res.assignmentId}`).get();
    const keys = keysSnap.data()!;
    expect(keys.classId).toBe("c1");
    expect(keys.accountId).toBe(TEACHER.uid);
    expect(keys.gradingConfig[0].grading).toEqual({
      correctIndex: VALID_MC_CONFIG.correctIndex,
    });

    const refSnap = await db.doc(`activities/a1/assignmentRefs/c1`).get();
    const ref = refSnap.data()!;
    expect(ref.assignmentId).toBe(res.assignmentId);
    expect(ref.status).toBe("PUBLISHED");
    expect(ref.startedCount).toBe(0);
  });

  it("permite atribuir a mesma atividade a duas salas (RN-012)", async () => {
    await seedClass(db, "c1", TEACHER.uid);
    await seedClass(db, "c2", TEACHER.uid);
    await seedActivity(db, "a1", TEACHER.uid);
    await seedItem(db, "a1", "i1", TEACHER.uid);

    const res1 = await call({ classId: "c1", activityId: "a1" }, TEACHER);
    const res2 = await call({ classId: "c2", activityId: "a1" }, TEACHER);

    expect(res1.assignmentId).not.toBe(res2.assignmentId);

    const refs = await db.collection("activities/a1/assignmentRefs").get();
    expect(refs.size).toBe(2);
  });
});
