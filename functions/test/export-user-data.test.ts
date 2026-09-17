import { getAuth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { exportUserData } from "../src/privacy/export-user-data";
import {
  clearAuthEmulator,
  clearFirestoreEmulator,
  cleanupTestApp,
  initTestApp,
  wrapCallable,
} from "./helpers";
import { seedClass } from "./activity-fixtures";

type ExportResult = Record<string, unknown>;

let db: Firestore;
let call: ReturnType<typeof wrapCallable<undefined, ExportResult>>;

beforeAll(() => {
  db = initTestApp();
  call = wrapCallable(exportUserData);
});

afterAll(() => cleanupTestApp());

beforeEach(async () => {
  await clearFirestoreEmulator();
  await clearAuthEmulator();
});

async function seedAuthUser(uid: string, email: string) {
  await getAuth().createUser({ uid, email, password: "senha123456" });
}

describe("exportUserData (integração)", () => {
  it("rejeita chamada sem autenticação", async () => {
    await expect(call(undefined)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejeita conta inexistente", async () => {
    await seedAuthUser("fantasma", "fantasma@example.com");
    await expect(
      call(undefined, { uid: "fantasma", token: { role: "student" } }),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("aluno: devolve conta, matrículas, tentativas (com respostas) e resultados — só os próprios", async () => {
    await seedAuthUser("aluno-1", "aluno1@example.com");
    await db.doc("users/aluno-1").set({
      name: "Aluno Um",
      email: "aluno1@example.com",
      role: "student",
      isMinor: false,
    });
    await seedClass(db, "c1", "prof-1");
    await db.doc("classes/c1/enrollments/aluno-1").set({
      studentId: "aluno-1",
      studentName: "Aluno Um",
      studentEmail: "aluno1@example.com",
      accountId: "prof-1",
      status: "ACTIVE",
    });
    await db.doc("attempts/att-1").set({
      studentId: "aluno-1",
      classId: "c1",
      assignmentId: "a1",
      status: "GRADED",
    });
    await db.doc("attempts/att-1/answers/item-1").set({
      answerPayload: { selectedIndex: 1 },
    });
    await db.doc("attemptResults/att-1").set({
      studentId: "aluno-1",
      classId: "c1",
      assignmentId: "a1",
      score: 2,
      maxScore: 2,
      items: [],
    });
    await db.doc("consents/aluno-1/records/r1").set({
      type: "TERMS",
      textVersion: "1.0",
    });
    // dado de outro aluno - não pode vazar
    await db.doc("attempts/att-outro").set({
      studentId: "aluno-2",
      classId: "c1",
      assignmentId: "a1",
      status: "GRADED",
    });

    const res = await call(undefined, {
      uid: "aluno-1",
      token: { role: "student" },
    });

    expect(res.account).toMatchObject({ id: "aluno-1", name: "Aluno Um" });
    expect(res.enrollments).toHaveLength(1);
    expect((res.enrollments as { classId: string }[])[0]!.classId).toBe("c1");
    expect(res.attempts).toHaveLength(1);
    const attempt = (res.attempts as { id: string; answers: unknown[] }[])[0]!;
    expect(attempt.id).toBe("att-1");
    expect(attempt.answers).toHaveLength(1);
    expect(res.attemptResults).toHaveLength(1);
    expect(res.consents).toHaveLength(1);

    const auditSnap = await db
      .collection("auditLog")
      .where("uid", "==", "aluno-1")
      .get();
    expect(auditSnap.size).toBe(1);
    expect(auditSnap.docs[0]!.get("action")).toBe("exportUserData");
  });

  it("professor: devolve conta, salas e atividades — não inclui dados de alunos", async () => {
    await seedAuthUser("prof-1", "prof1@example.com");
    await db.doc("users/prof-1").set({
      name: "Prof Um",
      email: "prof1@example.com",
      role: "teacher",
    });
    await db.doc("accounts/prof-1").set({ status: "ACTIVE" });
    await seedClass(db, "c1", "prof-1");
    await db.doc("activities/act-1").set({
      accountId: "prof-1",
      title: "Capitais",
      type: "MULTIPLE_CHOICE",
      status: "READY",
    });
    // sala de outro professor - não pode vazar
    await seedClass(db, "c2", "prof-2");

    const res = await call(undefined, {
      uid: "prof-1",
      token: { role: "teacher" },
    });

    expect(res.account).toMatchObject({ id: "prof-1", name: "Prof Um" });
    expect(res.teacherAccount).toMatchObject({ status: "ACTIVE" });
    expect(res.classes).toHaveLength(1);
    expect(res.activities).toHaveLength(1);
    expect(res).not.toHaveProperty("enrollments");
  });
});
