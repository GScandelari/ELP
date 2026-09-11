import { getAuth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { addStudentToClass } from "../src/classes/add-student-to-class";
import {
  clearAuthEmulator,
  clearFirestoreEmulator,
  cleanupTestApp,
  initTestApp,
  wrapCallable,
} from "./helpers";

type AddStudentResult = {
  studentId: string;
  enrollmentType: "TEACHER_ASSIGNED";
};

let db: Firestore;
let call: ReturnType<
  typeof wrapCallable<
    { classId?: unknown; studentEmail?: unknown },
    AddStudentResult
  >
>;

beforeAll(() => {
  db = initTestApp();
  call = wrapCallable(addStudentToClass);
});

afterAll(() => cleanupTestApp());

beforeEach(async () => {
  await clearFirestoreEmulator();
  await clearAuthEmulator();
});

const teacherAuth = { uid: "prof-1", token: { role: "teacher" } };
const CLASS_ID = "turma-1";

async function seedClass(overrides: Record<string, unknown> = {}) {
  await db.doc(`classes/${CLASS_ID}`).set({
    accountId: "prof-1",
    name: "Turma X",
    description: "",
    enrollmentCode: "BCDFGH",
    status: "ACTIVE",
    studentCount: 0,
    ...overrides,
  });
}

async function seedAccount(
  email: string,
  role: "student" | "teacher",
  name = "Pessoa E2E",
) {
  const record = await getAuth().createUser({
    email,
    password: "senha123456",
    displayName: name,
  });
  await db
    .doc(`users/${record.uid}`)
    .set({ name, email, role, isMinor: false });
  return record.uid;
}

describe("addStudentToClass (integração)", () => {
  it("rejeita chamada sem autenticação", async () => {
    await expect(
      call({ classId: CLASS_ID, studentEmail: "a@test.com" }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejeita quem não é professor", async () => {
    await expect(
      call(
        { classId: CLASS_ID, studentEmail: "a@test.com" },
        { uid: "aluno-1", token: { role: "student" } },
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita sala de outro professor (RN-004)", async () => {
    await seedClass({ accountId: "outro-prof" });
    await expect(
      call({ classId: CLASS_ID, studentEmail: "a@test.com" }, teacherAuth),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita e-mail inválido", async () => {
    await seedClass();
    await expect(
      call({ classId: CLASS_ID, studentEmail: "não-é-email" }, teacherAuth),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("rejeita e-mail sem conta (caso B ainda não implementado)", async () => {
    await seedClass();
    await expect(
      call(
        { classId: CLASS_ID, studentEmail: "naoexiste@test.com" },
        teacherAuth,
      ),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("rejeita conta que não é de aluno", async () => {
    await seedClass();
    await seedAccount("outroprof@test.com", "teacher");
    await expect(
      call(
        { classId: CLASS_ID, studentEmail: "outroprof@test.com" },
        teacherAuth,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("inscreve o aluno (normalizando o e-mail) e incrementa studentCount", async () => {
    await seedClass();
    const uid = await seedAccount("aluno@test.com", "student", "Aluno E2E");

    const res = await call(
      { classId: CLASS_ID, studentEmail: "ALUNO@test.com" },
      teacherAuth,
    );
    expect(res.studentId).toBe(uid);
    expect(res.enrollmentType).toBe("TEACHER_ASSIGNED");

    const enrollment = await db
      .doc(`classes/${CLASS_ID}/enrollments/${uid}`)
      .get();
    expect(enrollment.data()).toMatchObject({
      enrollmentType: "TEACHER_ASSIGNED",
      status: "ACTIVE",
      accountId: "prof-1",
      studentName: "Aluno E2E",
    });

    const cls = await db.doc(`classes/${CLASS_ID}`).get();
    expect(cls.data()?.studentCount).toBe(1);
  });

  it("rejeita inscrever o mesmo aluno duas vezes", async () => {
    await seedClass();
    await seedAccount("aluno@test.com", "student");
    await call(
      { classId: CLASS_ID, studentEmail: "aluno@test.com" },
      teacherAuth,
    );
    await expect(
      call({ classId: CLASS_ID, studentEmail: "aluno@test.com" }, teacherAuth),
    ).rejects.toMatchObject({ code: "already-exists" });
  });

  it("reingresso depois de remoção reativa em vez de duplicar", async () => {
    await seedClass();
    const uid = await seedAccount("aluno@test.com", "student");
    await db.doc(`classes/${CLASS_ID}/enrollments/${uid}`).set({
      studentId: uid,
      accountId: "prof-1",
      enrollmentType: "SELF_ENROLLMENT",
      status: "REMOVED",
      createdAt: new Date(),
    });

    const res = await call(
      { classId: CLASS_ID, studentEmail: "aluno@test.com" },
      teacherAuth,
    );
    expect(res.studentId).toBe(uid);

    const enrollment = await db
      .doc(`classes/${CLASS_ID}/enrollments/${uid}`)
      .get();
    expect(enrollment.data()).toMatchObject({
      status: "ACTIVE",
      enrollmentType: "TEACHER_ASSIGNED",
    });
  });
});
