import { getAuth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { deleteUserData } from "../src/privacy/delete-user-data";
import {
  clearAuthEmulator,
  clearFirestoreEmulator,
  cleanupTestApp,
  initTestApp,
  itRejectsWithoutAuthOrAccount,
  seedAuthUser,
  wrapCallable,
} from "./helpers";
import { seedClass } from "./activity-fixtures";

type DeleteResult = { ok: boolean };

let db: Firestore;
let call: ReturnType<typeof wrapCallable<undefined, DeleteResult>>;

beforeAll(() => {
  db = initTestApp();
  call = wrapCallable(deleteUserData);
});

afterAll(() => cleanupTestApp());

beforeEach(async () => {
  await clearFirestoreEmulator();
  await clearAuthEmulator();
});

describe("deleteUserData (integração)", () => {
  itRejectsWithoutAuthOrAccount(() => call);

  it("aluno: anonimiza conta, matrículas e attempts/attemptResults; grava auditLog; exclui do Auth", async () => {
    await seedAuthUser("aluno-1", "aluno1@example.com");
    await db.doc("users/aluno-1").set({
      name: "Aluno Um",
      email: "aluno1@example.com",
      role: "student",
      status: "ACTIVE",
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
    await db.doc("attemptResults/att-1").set({
      studentId: "aluno-1",
      classId: "c1",
      assignmentId: "a1",
      score: 2,
      maxScore: 2,
      items: [],
    });
    await db.doc("classes/c1/resultsSummary/aluno-1").set({
      accountId: "prof-1",
      assignmentScores: { a1: { score: 2, maxScore: 2 } },
    });

    const res = await call(undefined, {
      uid: "aluno-1",
      token: { role: "student" },
    });
    expect(res.ok).toBe(true);

    const userSnap = await db.doc("users/aluno-1").get();
    expect(userSnap.get("name")).toBe("Usuário excluído");
    expect(userSnap.get("email")).toBeNull();
    expect(userSnap.get("status")).toBe("DELETED");

    const enrollmentSnap = await db.doc("classes/c1/enrollments/aluno-1").get();
    expect(enrollmentSnap.get("studentName")).toBe("Usuário excluído");
    expect(enrollmentSnap.get("studentEmail")).toBe("");

    const attemptSnap = await db.doc("attempts/att-1").get();
    expect(attemptSnap.get("studentId")).toBe("deleted-aluno-1");

    const resultSnap = await db.doc("attemptResults/att-1").get();
    expect(resultSnap.get("studentId")).toBe("deleted-aluno-1");

    // resultsSummary nunca é tocado (já é agregação, ADR-011 §4)
    const summarySnap = await db.doc("classes/c1/resultsSummary/aluno-1").get();
    expect(summarySnap.get("assignmentScores.a1.score")).toBe(2);

    const auditSnap = await db
      .collection("auditLog")
      .where("uid", "==", "aluno-1")
      .get();
    expect(auditSnap.size).toBe(1);
    expect(auditSnap.docs[0]!.get("action")).toBe("deleteUserData");

    await expect(getAuth().getUser("aluno-1")).rejects.toThrow();
  });

  it("professor: anonimiza só a própria conta — salas e atividades continuam intactas", async () => {
    await seedAuthUser("prof-1", "prof1@example.com");
    await db.doc("users/prof-1").set({
      name: "Prof Um",
      email: "prof1@example.com",
      role: "teacher",
      status: "ACTIVE",
    });
    await db.doc("accounts/prof-1").set({ status: "ACTIVE" });
    await seedClass(db, "c1", "prof-1");

    await call(undefined, { uid: "prof-1", token: { role: "teacher" } });

    const userSnap = await db.doc("users/prof-1").get();
    expect(userSnap.get("name")).toBe("Usuário excluído");
    expect(userSnap.get("status")).toBe("DELETED");

    const classSnap = await db.doc("classes/c1").get();
    expect(classSnap.exists).toBe(true);
    expect(classSnap.get("accountId")).toBe("prof-1");
  });
});
