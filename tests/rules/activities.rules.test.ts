import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
let testEnv: RulesTestEnvironment;

const TEACHER = "teacher-1";
const OTHER_TEACHER = "teacher-2";
const STUDENT = "student-1";
const OTHER_STUDENT = "student-2";
const CLASS_ID = "class-1";
const ACTIVITY_ID = "activity-1"; // locked: false
const LOCKED_ACTIVITY_ID = "activity-2"; // locked: true
const ITEM_ID = "item-1";
const ASSIGNMENT_ID = "assignment-1"; // status: PUBLISHED
const CLOSED_ASSIGNMENT_ID = "assignment-2"; // status: CLOSED

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-elp-activities-rules",
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

    await setDoc(doc(db, `activities/${ACTIVITY_ID}`), {
      accountId: TEACHER,
      title: "Atividade A",
      type: "MULTIPLE_CHOICE",
      status: "DRAFT",
      locked: false,
      itemCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await setDoc(doc(db, `activities/${ACTIVITY_ID}/items/${ITEM_ID}`), {
      accountId: TEACHER,
      position: 0,
      prompt: "Where does John live?",
      configuration: { question: "...", options: ["A", "B"], correctIndex: 0 },
      points: 1,
    });
    await setDoc(
      doc(db, `activities/${ACTIVITY_ID}/assignmentRefs/${CLASS_ID}`),
      {
        accountId: TEACHER,
        classId: CLASS_ID,
        className: "Turma A",
        assignmentId: ASSIGNMENT_ID,
        status: "PUBLISHED",
        startedCount: 0,
      },
    );

    await setDoc(doc(db, `activities/${LOCKED_ACTIVITY_ID}`), {
      accountId: TEACHER,
      title: "Atividade travada",
      type: "MULTIPLE_CHOICE",
      status: "LOCKED",
      locked: true,
      itemCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await setDoc(doc(db, `activities/${LOCKED_ACTIVITY_ID}/items/${ITEM_ID}`), {
      accountId: TEACHER,
      position: 0,
      prompt: "...",
      configuration: {},
      points: 1,
    });

    await setDoc(doc(db, `classes/${CLASS_ID}`), {
      accountId: TEACHER,
      name: "Turma A",
      status: "ACTIVE",
      studentCount: 1,
      createdAt: new Date(),
    });
    await setDoc(doc(db, `classes/${CLASS_ID}/enrollments/${STUDENT}`), {
      studentId: STUDENT,
      accountId: TEACHER,
      enrollmentType: "SELF_ENROLLMENT",
      status: "ACTIVE",
    });
    await setDoc(doc(db, `classes/${CLASS_ID}/assignments/${ASSIGNMENT_ID}`), {
      accountId: TEACHER,
      activityId: ACTIVITY_ID,
      activityTitle: "Atividade A",
      type: "MULTIPLE_CHOICE",
      contentSnapshot: [
        { prompt: "Where does John live?", options: ["A", "B"] },
      ],
      status: "PUBLISHED",
      position: 0,
      maxAttempts: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await setDoc(
      doc(db, `classes/${CLASS_ID}/assignments/${CLOSED_ASSIGNMENT_ID}`),
      {
        accountId: TEACHER,
        activityId: ACTIVITY_ID,
        activityTitle: "Atividade A",
        type: "MULTIPLE_CHOICE",
        contentSnapshot: [
          { prompt: "Where does John live?", options: ["A", "B"] },
        ],
        status: "CLOSED",
        position: 1,
        maxAttempts: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    await setDoc(doc(db, `assignmentKeys/${ASSIGNMENT_ID}`), {
      classId: CLASS_ID,
      accountId: TEACHER,
      gradingConfig: [{ correctIndex: 0, points: 1 }],
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

describe("firestore.rules — activities (Fase 3)", () => {
  it("1. professor lê/lista a própria atividade", async () => {
    await assertSucceeds(getDoc(doc(teacher(), `activities/${ACTIVITY_ID}`)));
    const snap = await assertSucceeds(
      getDocs(
        query(
          collection(teacher(), "activities"),
          where("accountId", "==", TEACHER),
        ),
      ),
    );
    expect(snap.size).toBe(2); // ACTIVITY_ID + LOCKED_ACTIVITY_ID
  });

  it("2. professor lista atividades filtrando por accountId próprio (regressão list)", async () => {
    const snap = await assertSucceeds(
      getDocs(
        query(
          collection(teacher(), "activities"),
          where("accountId", "==", TEACHER),
        ),
      ),
    );
    expect(snap.size).toBeGreaterThan(0);
  });

  it("3. outro professor não lê nem lista", async () => {
    await assertFails(getDoc(doc(otherTeacher(), `activities/${ACTIVITY_ID}`)));
    await assertFails(
      getDocs(
        query(
          collection(otherTeacher(), "activities"),
          where("accountId", "==", TEACHER), // tenta "espiar" filtrando pelo dono real
        ),
      ),
    );
  });

  it("4. professor cria/edita atividade locked: false", async () => {
    await assertSucceeds(
      setDoc(doc(teacher(), "activities/nova"), {
        accountId: TEACHER,
        title: "Nova",
        type: "MULTIPLE_CHOICE",
        status: "DRAFT",
        locked: false,
      }),
    );
    await assertSucceeds(
      updateDoc(doc(teacher(), `activities/${ACTIVITY_ID}`), {
        title: "Editada",
      }),
    );
  });

  it("5. professor não edita/deleta atividade locked: true", async () => {
    await assertFails(
      updateDoc(doc(teacher(), `activities/${LOCKED_ACTIVITY_ID}`), {
        title: "x",
      }),
    );
    await assertFails(
      deleteDoc(doc(teacher(), `activities/${LOCKED_ACTIVITY_ID}`)),
    );
  });

  it("6. professor lista os itens da própria atividade (regressão list)", async () => {
    const snap = await assertSucceeds(
      getDocs(
        query(
          collection(teacher(), `activities/${ACTIVITY_ID}/items`),
          where("accountId", "==", TEACHER),
        ),
      ),
    );
    expect(snap.size).toBe(1);
  });

  it("7. professor escreve item de atividade não travada", async () => {
    await assertSucceeds(
      updateDoc(doc(teacher(), `activities/${ACTIVITY_ID}/items/${ITEM_ID}`), {
        points: 2,
      }),
    );
  });

  it("8. professor não escreve item de atividade travada", async () => {
    await assertFails(
      updateDoc(
        doc(teacher(), `activities/${LOCKED_ACTIVITY_ID}/items/${ITEM_ID}`),
        {
          points: 2,
        },
      ),
    );
  });

  it("9. professor lista os assignments da própria sala (regressão list)", async () => {
    const snap = await assertSucceeds(
      getDocs(
        query(
          collection(teacher(), `classes/${CLASS_ID}/assignments`),
          where("accountId", "==", TEACHER),
        ),
      ),
    );
    expect(snap.size).toBe(2);
  });

  it("10. outro professor não consegue listar assignments filtrando pelo accountId do dono", async () => {
    await assertFails(
      getDocs(
        query(
          collection(otherTeacher(), `classes/${CLASS_ID}/assignments`),
          where("accountId", "==", TEACHER),
        ),
      ),
    );
  });

  it("11. aluno inscrito lê um assignment PUBLISHED ou CLOSED da própria sala", async () => {
    await assertSucceeds(
      getDoc(
        doc(student(), `classes/${CLASS_ID}/assignments/${ASSIGNMENT_ID}`),
      ),
    );
    await assertSucceeds(
      getDoc(
        doc(
          student(),
          `classes/${CLASS_ID}/assignments/${CLOSED_ASSIGNMENT_ID}`,
        ),
      ),
    );
  });

  it("12. aluno não inscrito não lê o assignment", async () => {
    await assertFails(
      getDoc(
        doc(otherStudent(), `classes/${CLASS_ID}/assignments/${ASSIGNMENT_ID}`),
      ),
    );
  });

  it("13. client não cria/deleta assignment diretamente", async () => {
    await assertFails(
      setDoc(doc(teacher(), `classes/${CLASS_ID}/assignments/novo`), {
        accountId: TEACHER,
        status: "PUBLISHED",
      }),
    );
  });

  it("14. client não lê/escreve assignmentKeys", async () => {
    await assertFails(
      getDoc(doc(teacher(), `assignmentKeys/${ASSIGNMENT_ID}`)),
    );
    await assertFails(
      setDoc(doc(teacher(), `assignmentKeys/${ASSIGNMENT_ID}`), {
        gradingConfig: [],
      }),
    );
  });

  it("15. professor lê assignmentRefs da própria atividade", async () => {
    await assertSucceeds(
      getDoc(
        doc(teacher(), `activities/${ACTIVITY_ID}/assignmentRefs/${CLASS_ID}`),
      ),
    );
  });

  it("16. client não escreve assignmentRefs", async () => {
    await assertFails(
      setDoc(
        doc(teacher(), `activities/${ACTIVITY_ID}/assignmentRefs/${CLASS_ID}`),
        {
          status: "CLOSED",
        },
      ),
    );
  });
});
