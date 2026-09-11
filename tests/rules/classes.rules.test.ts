import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
let testEnv: RulesTestEnvironment;

const TEACHER = "teacher-1";
const OTHER_TEACHER = "teacher-2";
const STUDENT = "student-1";
const OTHER_STUDENT = "student-2";
const CLASS_ID = "class-1";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-elp-classes-rules",
    firestore: {
      rules: readFileSync(resolve(here, "../../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `classes/${CLASS_ID}`), {
      accountId: TEACHER,
      name: "Turma A",
      description: "",
      enrollmentCode: "BCD234",
      status: "ACTIVE",
      studentCount: 1,
    });
    await setDoc(doc(db, `classes/${CLASS_ID}/enrollments/${STUDENT}`), {
      studentId: STUDENT,
      enrollmentType: "SELF_ENROLLMENT",
      status: "ACTIVE",
    });
    await setDoc(doc(db, "enrollmentCodes/BCD234"), {
      classId: CLASS_ID,
      accountId: TEACHER,
    });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

function db(uid: string | null, claims: Record<string, unknown> = {}) {
  return uid
    ? testEnv.authenticatedContext(uid, claims).firestore()
    : testEnv.unauthenticatedContext().firestore();
}

const teacher = () => db(TEACHER, { role: "teacher" });
const otherTeacher = () => db(OTHER_TEACHER, { role: "teacher" });
const student = () => db(STUDENT, { role: "student" });
const otherStudent = () => db(OTHER_STUDENT, { role: "student" });

describe("firestore.rules — classes (Fase 2 / RN-004)", () => {
  it("1. professor dono lê a própria sala", async () => {
    await assertSucceeds(getDoc(doc(teacher(), `classes/${CLASS_ID}`)));
  });

  it("2. outro professor não lê a sala", async () => {
    await assertFails(getDoc(doc(otherTeacher(), `classes/${CLASS_ID}`)));
  });

  it("3. aluno inscrito lê a sala", async () => {
    await assertSucceeds(getDoc(doc(student(), `classes/${CLASS_ID}`)));
  });

  it("4. aluno não inscrito não lê a sala", async () => {
    await assertFails(getDoc(doc(otherStudent(), `classes/${CLASS_ID}`)));
  });

  it("5. cliente não cria sala diretamente (só via createClass)", async () => {
    await assertFails(
      setDoc(doc(teacher(), "classes/nova"), {
        accountId: TEACHER,
        name: "Nova",
        enrollmentCode: "BCD999",
        status: "ACTIVE",
        studentCount: 0,
      }),
    );
  });

  it("6. dono edita nome e status diretamente", async () => {
    await assertSucceeds(
      updateDoc(doc(teacher(), `classes/${CLASS_ID}`), {
        name: "Turma A - renomeada",
        status: "INACTIVE",
      }),
    );
  });

  it("7a. dono não altera o enrollmentCode diretamente", async () => {
    await assertFails(
      updateDoc(doc(teacher(), `classes/${CLASS_ID}`), {
        enrollmentCode: "BCD999",
      }),
    );
  });

  it("7b. dono não altera o studentCount diretamente", async () => {
    await assertFails(
      updateDoc(doc(teacher(), `classes/${CLASS_ID}`), { studentCount: 99 }),
    );
  });

  it("7c. dono não transfere a sala (accountId)", async () => {
    await assertFails(
      updateDoc(doc(teacher(), `classes/${CLASS_ID}`), {
        accountId: OTHER_TEACHER,
      }),
    );
  });

  it("8. cliente não escreve em enrollments", async () => {
    await assertFails(
      setDoc(doc(student(), `classes/${CLASS_ID}/enrollments/${STUDENT}`), {
        studentId: STUDENT,
        status: "ACTIVE",
      }),
    );
  });

  it("9. cliente não lê nem escreve enrollmentCodes", async () => {
    await assertFails(getDoc(doc(teacher(), "enrollmentCodes/BCD234")));
    await assertFails(
      setDoc(doc(teacher(), "enrollmentCodes/BCD777"), { classId: CLASS_ID }),
    );
  });

  it("10. aluno lê a própria inscrição", async () => {
    await assertSucceeds(
      getDoc(doc(student(), `classes/${CLASS_ID}/enrollments/${STUDENT}`)),
    );
  });

  it("11. aluno não lê a inscrição de outro aluno", async () => {
    await assertFails(
      getDoc(doc(otherStudent(), `classes/${CLASS_ID}/enrollments/${STUDENT}`)),
    );
  });

  it("12. professor dono lê o roster da sala", async () => {
    await assertSucceeds(
      getDoc(doc(teacher(), `classes/${CLASS_ID}/enrollments/${STUDENT}`)),
    );
  });
});
