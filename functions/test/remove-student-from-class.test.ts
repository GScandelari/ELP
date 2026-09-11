import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { removeStudentFromClass } from "../src/classes/remove-student-from-class";
import {
  clearFirestoreEmulator,
  cleanupTestApp,
  initTestApp,
  wrapCallable,
} from "./helpers";

type RemoveResult = { ok: boolean };

let db: Firestore;
let call: ReturnType<
  typeof wrapCallable<{ classId?: unknown; studentId?: unknown }, RemoveResult>
>;

beforeAll(() => {
  db = initTestApp();
  call = wrapCallable(removeStudentFromClass);
});

afterAll(() => cleanupTestApp());

beforeEach(() => clearFirestoreEmulator());

const teacherAuth = { uid: "prof-1", token: { role: "teacher" } };
const CLASS_ID = "turma-1";
const STUDENT_ID = "aluno-1";

async function seedClassWithStudent(overrides: Record<string, unknown> = {}) {
  await db.doc(`classes/${CLASS_ID}`).set({
    accountId: "prof-1",
    name: "Turma X",
    description: "",
    enrollmentCode: "BCDFGH",
    status: "ACTIVE",
    studentCount: 1,
  });
  await db.doc(`classes/${CLASS_ID}/enrollments/${STUDENT_ID}`).set({
    studentId: STUDENT_ID,
    accountId: "prof-1",
    enrollmentType: "SELF_ENROLLMENT",
    status: "ACTIVE",
    studentName: "Aluno E2E",
    studentEmail: "aluno@test.com",
    createdAt: new Date(),
    ...overrides,
  });
}

describe("removeStudentFromClass (integração)", () => {
  it("rejeita chamada sem autenticação", async () => {
    await expect(
      call({ classId: CLASS_ID, studentId: STUDENT_ID }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejeita quem não é professor", async () => {
    await expect(
      call(
        { classId: CLASS_ID, studentId: STUDENT_ID },
        { uid: STUDENT_ID, token: { role: "student" } },
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita sala de outro professor (RN-004)", async () => {
    await db.doc(`classes/${CLASS_ID}`).set({
      accountId: "outro-prof",
      name: "Turma X",
      status: "ACTIVE",
      studentCount: 0,
    });
    await expect(
      call({ classId: CLASS_ID, studentId: STUDENT_ID }, teacherAuth),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita aluno não inscrito", async () => {
    await db.doc(`classes/${CLASS_ID}`).set({
      accountId: "prof-1",
      name: "Turma X",
      status: "ACTIVE",
      studentCount: 0,
    });
    await expect(
      call({ classId: CLASS_ID, studentId: STUDENT_ID }, teacherAuth),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("rejeita remover quem já foi removido", async () => {
    await seedClassWithStudent({ status: "REMOVED" });
    await expect(
      call({ classId: CLASS_ID, studentId: STUDENT_ID }, teacherAuth),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("remove o aluno e decrementa studentCount", async () => {
    await seedClassWithStudent();

    const res = await call(
      { classId: CLASS_ID, studentId: STUDENT_ID },
      teacherAuth,
    );
    expect(res.ok).toBe(true);

    const enrollment = await db
      .doc(`classes/${CLASS_ID}/enrollments/${STUDENT_ID}`)
      .get();
    expect(enrollment.data()?.status).toBe("REMOVED");

    const cls = await db.doc(`classes/${CLASS_ID}`).get();
    expect(cls.data()?.studentCount).toBe(0);
  });
});
