import { initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import functionsTest from "firebase-functions-test";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { joinClassByCode } from "../src/classes/join-class-by-code";

const PROJECT_ID = "demo-elp";
const fft = functionsTest();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wrapped: any;
let db: Firestore;

beforeAll(() => {
  initializeApp({ projectId: PROJECT_ID });
  db = getFirestore();
  wrapped = fft.wrap(joinClassByCode);
});

afterAll(() => fft.cleanup());

beforeEach(async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  await fetch(
    `http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
});

function call(
  data: unknown,
  auth?: { uid: string; token?: Record<string, unknown> },
) {
  return wrapped({ data, auth });
}

const studentAuth = { uid: "aluno-1", token: { role: "student" } };
const CODE = "BCDFGH";
const CLASS_ID = "turma-1";

async function seedClass(overrides: Record<string, unknown> = {}) {
  await db.doc(`classes/${CLASS_ID}`).set({
    accountId: "prof-1",
    name: "Turma X",
    description: "",
    enrollmentCode: CODE,
    status: "ACTIVE",
    studentCount: 0,
    ...overrides,
  });
  await db
    .doc(`enrollmentCodes/${CODE}`)
    .set({ classId: CLASS_ID, accountId: "prof-1" });
}

async function seedStudent(uid: string, isMinor = false) {
  await db.doc(`users/${uid}`).set({
    name: "Aluno E2E",
    email: `${uid}@test.com`,
    role: "student",
    isMinor,
  });
}

describe("joinClassByCode (integração)", () => {
  it("rejeita chamada sem autenticação", async () => {
    await expect(call({ code: CODE })).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejeita quem não é aluno", async () => {
    await expect(
      call({ code: CODE }, { uid: "prof-1", token: { role: "teacher" } }),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita aluno menor (defesa em profundidade da RF-021)", async () => {
    await seedStudent("aluno-1", true);
    await seedClass();
    await expect(call({ code: CODE }, studentAuth)).rejects.toMatchObject({
      code: "failed-precondition",
    });
  });

  it("rejeita código com formato inválido sem consultar o Firestore", async () => {
    await seedStudent("aluno-1");
    await expect(
      call({ code: "AAA111" }, studentAuth), // 'A' e '1' fora do alfabeto
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("rejeita código bem formado mas inexistente", async () => {
    await seedStudent("aluno-1");
    await expect(call({ code: "ZZZZZZ" }, studentAuth)).rejects.toMatchObject({
      code: "not-found",
    });
  });

  it("rejeita sala inativa (RN-002)", async () => {
    await seedStudent("aluno-1");
    await seedClass({ status: "INACTIVE" });
    await expect(call({ code: CODE }, studentAuth)).rejects.toMatchObject({
      code: "failed-precondition",
    });
  });

  it("inscreve o aluno e incrementa studentCount", async () => {
    await seedStudent("aluno-1");
    await seedClass();

    const res = await call({ code: CODE }, studentAuth);
    expect(res.classId).toBe(CLASS_ID);
    expect(res.className).toBe("Turma X");

    const enrollment = await db
      .doc(`classes/${CLASS_ID}/enrollments/aluno-1`)
      .get();
    expect(enrollment.exists).toBe(true);
    expect(enrollment.data()).toMatchObject({
      enrollmentType: "SELF_ENROLLMENT",
      status: "ACTIVE",
      studentName: "Aluno E2E",
    });

    const cls = await db.doc(`classes/${CLASS_ID}`).get();
    expect(cls.data()?.studentCount).toBe(1);
  });

  it("aceita o código com hífen e minúsculas (normalização)", async () => {
    await seedStudent("aluno-1");
    await seedClass();
    const res = await call({ code: "bcd-fgh" }, studentAuth);
    expect(res.classId).toBe(CLASS_ID);
  });

  it("rejeita segunda inscrição na mesma sala (RN-003)", async () => {
    await seedStudent("aluno-1");
    await seedClass();
    await call({ code: CODE }, studentAuth);
    await expect(call({ code: CODE }, studentAuth)).rejects.toMatchObject({
      code: "already-exists",
    });
  });

  it("reingresso depois de remoção reativa em vez de duplicar", async () => {
    await seedStudent("aluno-1");
    await seedClass();
    await db.doc(`classes/${CLASS_ID}/enrollments/aluno-1`).set({
      studentId: "aluno-1",
      enrollmentType: "TEACHER_ASSIGNED",
      status: "REMOVED",
      createdAt: new Date(),
    });

    const res = await call({ code: CODE }, studentAuth);
    expect(res.classId).toBe(CLASS_ID);

    const enrollment = await db
      .doc(`classes/${CLASS_ID}/enrollments/aluno-1`)
      .get();
    expect(enrollment.data()?.status).toBe("ACTIVE");
  });
});
