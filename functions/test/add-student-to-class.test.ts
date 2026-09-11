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

type AddStudentPayload = {
  classId?: unknown;
  studentEmail?: unknown;
  studentName?: unknown;
  isMinor?: unknown;
  guardianConsent?: {
    guardianName?: unknown;
    statementAccepted?: unknown;
  };
};

type AddStudentResult = {
  studentId: string;
  enrollmentType: "TEACHER_ASSIGNED";
  passwordSetupLink?: string;
};

let db: Firestore;
let call: ReturnType<typeof wrapCallable<AddStudentPayload, AddStudentResult>>;

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

describe("addStudentToClass — caso B (aluno sem conta)", () => {
  it("rejeita sem o nome do aluno", async () => {
    await seedClass();
    await expect(
      call(
        { classId: CLASS_ID, studentEmail: "novo@test.com", isMinor: false },
        teacherAuth,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("rejeita menor sem consentimento do responsável (RF-021)", async () => {
    await seedClass();
    await expect(
      call(
        {
          classId: CLASS_ID,
          studentEmail: "menor@test.com",
          studentName: "Aluno Menor",
          isMinor: true,
        },
        teacherAuth,
      ),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("rejeita menor com nome do responsável mas sem aceite explícito", async () => {
    await seedClass();
    await expect(
      call(
        {
          classId: CLASS_ID,
          studentEmail: "menor@test.com",
          studentName: "Aluno Menor",
          isMinor: true,
          guardianConsent: {
            guardianName: "Responsável Legal",
            statementAccepted: false,
          },
        },
        teacherAuth,
      ),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("cria a conta de um aluno adulto sem conta e devolve o link de senha", async () => {
    await seedClass();
    const res = await call(
      {
        classId: CLASS_ID,
        studentEmail: "novo@test.com",
        studentName: "Aluno Novo",
        isMinor: false,
      },
      teacherAuth,
    );

    expect(res.enrollmentType).toBe("TEACHER_ASSIGNED");
    expect(res.passwordSetupLink).toBeTruthy();

    const authUser = await getAuth().getUser(res.studentId);
    expect(authUser.customClaims).toMatchObject({ role: "student" });

    const userDoc = await db.doc(`users/${res.studentId}`).get();
    expect(userDoc.data()).toMatchObject({
      name: "Aluno Novo",
      email: "novo@test.com",
      role: "student",
      isMinor: false,
    });

    const consents = await db
      .collection(`consents/${res.studentId}/records`)
      .get();
    expect(consents.empty).toBe(true); // sem GUARDIAN_CONSENT para adulto

    const enrollment = await db
      .doc(`classes/${CLASS_ID}/enrollments/${res.studentId}`)
      .get();
    expect(enrollment.data()).toMatchObject({
      status: "ACTIVE",
      enrollmentType: "TEACHER_ASSIGNED",
      studentName: "Aluno Novo",
    });
  });

  it("cria a conta de um aluno menor e registra o GUARDIAN_CONSENT", async () => {
    await seedClass();
    const res = await call(
      {
        classId: CLASS_ID,
        studentEmail: "menor@test.com",
        studentName: "Aluno Menor",
        isMinor: true,
        guardianConsent: {
          guardianName: "Responsável Legal",
          statementAccepted: true,
        },
      },
      teacherAuth,
    );

    expect(res.passwordSetupLink).toBeTruthy();

    const userDoc = await db.doc(`users/${res.studentId}`).get();
    expect(userDoc.data()).toMatchObject({ isMinor: true, role: "student" });

    const consents = await db
      .collection(`consents/${res.studentId}/records`)
      .get();
    expect(consents.size).toBe(1);
    expect(consents.docs[0]?.data()).toMatchObject({
      type: "GUARDIAN_CONSENT",
      grantedByRole: "teacher",
      grantedByUid: "prof-1",
      guardianName: "Responsável Legal",
    });
  });
});
