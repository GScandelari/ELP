import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import functionsTest from "firebase-functions-test";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { isValidCode } from "../src/classes/enrollment-code";
import { createClass } from "../src/classes/create-class";

const PROJECT_ID = "demo-elp";
const fft = functionsTest();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wrapped: any;

beforeAll(() => {
  initializeApp({ projectId: PROJECT_ID });
  wrapped = fft.wrap(createClass);
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

const teacherAuth = { uid: "prof-1", token: { role: "teacher" } };

describe("createClass (integração)", () => {
  it("rejeita chamada sem autenticação", async () => {
    await expect(call({ name: "Turma" })).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejeita quem não é professor", async () => {
    await expect(
      call({ name: "Turma" }, { uid: "aluno-1", token: { role: "student" } }),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita nome muito curto", async () => {
    await expect(call({ name: "x" }, teacherAuth)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("rejeita descrição acima de 500 caracteres", async () => {
    await expect(
      call({ name: "Turma", description: "a".repeat(501) }, teacherAuth),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("cria a sala e o código de inscrição no mesmo commit", async () => {
    const res = await call(
      { name: "Inglês 6º ano", description: "Turma da manhã" },
      teacherAuth,
    );

    expect(res.classId).toBeTruthy();
    expect(isValidCode(res.enrollmentCode)).toBe(true);

    const db = getFirestore();
    const cls = await db.doc(`classes/${res.classId}`).get();
    expect(cls.exists).toBe(true);
    expect(cls.data()).toMatchObject({
      accountId: "prof-1",
      name: "Inglês 6º ano",
      description: "Turma da manhã",
      enrollmentCode: res.enrollmentCode,
      status: "ACTIVE",
      studentCount: 0,
    });

    const code = await db.doc(`enrollmentCodes/${res.enrollmentCode}`).get();
    expect(code.exists).toBe(true);
    expect(code.data()).toMatchObject({
      classId: res.classId,
      accountId: "prof-1",
    });
  });

  it("gera códigos diferentes para salas diferentes", async () => {
    const a = await call({ name: "Turma A" }, teacherAuth);
    const b = await call({ name: "Turma B" }, teacherAuth);
    expect(a.enrollmentCode).not.toBe(b.enrollmentCode);
  });
});
