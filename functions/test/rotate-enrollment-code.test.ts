import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { isValidCode } from "../src/classes/enrollment-code";
import { rotateEnrollmentCode } from "../src/classes/rotate-enrollment-code";
import {
  clearFirestoreEmulator,
  cleanupTestApp,
  initTestApp,
  wrapCallable,
} from "./helpers";

type RotateResult = { enrollmentCode: string };

let db: Firestore;
let call: ReturnType<typeof wrapCallable<{ classId?: unknown }, RotateResult>>;

beforeAll(() => {
  db = initTestApp();
  call = wrapCallable(rotateEnrollmentCode);
});

afterAll(() => cleanupTestApp());

beforeEach(() => clearFirestoreEmulator());

const teacherAuth = { uid: "prof-1", token: { role: "teacher" } };
const CLASS_ID = "turma-1";
const OLD_CODE = "BCDFGH";

async function seedClass(overrides: Record<string, unknown> = {}) {
  await db.doc(`classes/${CLASS_ID}`).set({
    accountId: "prof-1",
    name: "Turma X",
    description: "",
    enrollmentCode: OLD_CODE,
    status: "ACTIVE",
    studentCount: 0,
    ...overrides,
  });
  await db
    .doc(`enrollmentCodes/${OLD_CODE}`)
    .set({ classId: CLASS_ID, accountId: "prof-1" });
}

describe("rotateEnrollmentCode (integração)", () => {
  it("rejeita chamada sem autenticação", async () => {
    await expect(call({ classId: CLASS_ID })).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejeita quem não é professor", async () => {
    await expect(
      call(
        { classId: CLASS_ID },
        { uid: "aluno-1", token: { role: "student" } },
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita sala de outro professor (RN-004)", async () => {
    await seedClass({ accountId: "outro-prof" });
    await expect(
      call({ classId: CLASS_ID }, teacherAuth),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("gera um código novo, válido e diferente do anterior", async () => {
    await seedClass();
    const res = await call({ classId: CLASS_ID }, teacherAuth);

    expect(isValidCode(res.enrollmentCode)).toBe(true);
    expect(res.enrollmentCode).not.toBe(OLD_CODE);

    const cls = await db.doc(`classes/${CLASS_ID}`).get();
    expect(cls.data()?.enrollmentCode).toBe(res.enrollmentCode);
  });

  it("invalida o código antigo e ativa o novo em enrollmentCodes", async () => {
    await seedClass();
    const res = await call({ classId: CLASS_ID }, teacherAuth);

    const oldDoc = await db.doc(`enrollmentCodes/${OLD_CODE}`).get();
    expect(oldDoc.exists).toBe(false);

    const newDoc = await db.doc(`enrollmentCodes/${res.enrollmentCode}`).get();
    expect(newDoc.exists).toBe(true);
    expect(newDoc.data()).toMatchObject({
      classId: CLASS_ID,
      accountId: "prof-1",
    });
  });
});
