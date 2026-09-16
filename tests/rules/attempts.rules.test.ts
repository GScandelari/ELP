import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextFactory,
  createRulesTestEnv,
  OTHER_STUDENT,
  OTHER_TEACHER,
  seedClassWithStudent,
  standardActors,
  STUDENT,
  TEACHER,
} from "./helpers";

let testEnv: RulesTestEnvironment;
let db: ReturnType<typeof contextFactory>;

const CLASS_ID = "class-1";
const ASSIGNMENT_ID = "assignment-1"; // resultsReleased: false
const RELEASED_ASSIGNMENT_ID = "assignment-2"; // resultsReleased: true
const ATTEMPT_ID = "attempt-1"; // IN_PROGRESS
const GRADED_ATTEMPT_ID = "attempt-2"; // GRADED, ligado ao assignment não liberado
const RELEASED_ATTEMPT_ID = "attempt-3"; // GRADED, ligado ao assignment liberado

beforeAll(async () => {
  testEnv = await createRulesTestEnv("demo-elp-attempts-rules");
  db = contextFactory(testEnv);
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await seedClassWithStudent(db, CLASS_ID, TEACHER, STUDENT);

    await setDoc(doc(db, `classes/${CLASS_ID}/assignments/${ASSIGNMENT_ID}`), {
      accountId: TEACHER,
      activityId: "activity-1",
      activityTitle: "Atividade A",
      type: "MULTIPLE_CHOICE",
      contentSnapshot: [],
      status: "PUBLISHED",
      position: 0,
      maxAttempts: 1,
      resultsPolicy: "ON_TEACHER_RELEASE",
      resultsReleased: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await setDoc(
      doc(db, `classes/${CLASS_ID}/assignments/${RELEASED_ASSIGNMENT_ID}`),
      {
        accountId: TEACHER,
        activityId: "activity-1",
        activityTitle: "Atividade A",
        type: "MULTIPLE_CHOICE",
        contentSnapshot: [],
        status: "PUBLISHED",
        position: 1,
        maxAttempts: 1,
        resultsPolicy: "ON_TEACHER_RELEASE",
        resultsReleased: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    await setDoc(doc(db, `attempts/${ATTEMPT_ID}`), {
      assignmentId: ASSIGNMENT_ID,
      classId: CLASS_ID,
      activityId: "activity-1",
      studentId: STUDENT,
      attemptNumber: 1,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      submittedAt: null,
    });
    await setDoc(doc(db, `attempts/${GRADED_ATTEMPT_ID}`), {
      assignmentId: ASSIGNMENT_ID,
      classId: CLASS_ID,
      activityId: "activity-1",
      studentId: STUDENT,
      attemptNumber: 1,
      status: "GRADED",
      startedAt: new Date(),
      submittedAt: new Date(),
    });
    await setDoc(doc(db, `attempts/${RELEASED_ATTEMPT_ID}`), {
      assignmentId: RELEASED_ASSIGNMENT_ID,
      classId: CLASS_ID,
      activityId: "activity-1",
      studentId: STUDENT,
      attemptNumber: 1,
      status: "GRADED",
      startedAt: new Date(),
      submittedAt: new Date(),
    });

    await setDoc(doc(db, `attemptResults/${GRADED_ATTEMPT_ID}`), {
      studentId: STUDENT,
      classId: CLASS_ID,
      assignmentId: ASSIGNMENT_ID,
      score: 2,
      maxScore: 3,
      items: [{ itemId: "item-1", isCorrect: true, pointsAwarded: 2 }],
      gradedAt: new Date(),
    });
    await setDoc(doc(db, `attemptResults/${RELEASED_ATTEMPT_ID}`), {
      studentId: STUDENT,
      classId: CLASS_ID,
      assignmentId: RELEASED_ASSIGNMENT_ID,
      score: 3,
      maxScore: 3,
      items: [{ itemId: "item-1", isCorrect: true, pointsAwarded: 3 }],
      gradedAt: new Date(),
    });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

const { teacher, otherTeacher, student, otherStudent } = standardActors(
  (uid, claims) => db(uid, claims),
);

describe("firestore.rules — attempts / attemptResults (Fase 4)", () => {
  it("1. aluno lê a própria tentativa (get)", async () => {
    await assertSucceeds(getDoc(doc(student(), `attempts/${ATTEMPT_ID}`)));
  });

  it("2. aluno lista as próprias tentativas de um assignment (regressão list)", async () => {
    const snap = await assertSucceeds(
      getDocs(
        query(
          collection(student(), "attempts"),
          where("studentId", "==", STUDENT),
          where("assignmentId", "==", ASSIGNMENT_ID),
        ),
      ),
    );
    expect(snap.size).toBe(2); // ATTEMPT_ID + GRADED_ATTEMPT_ID
  });

  it("3. outro aluno não lê nem lista a tentativa", async () => {
    await assertFails(getDoc(doc(otherStudent(), `attempts/${ATTEMPT_ID}`)));
    await assertFails(
      getDocs(
        query(
          collection(otherStudent(), "attempts"),
          where("studentId", "==", STUDENT),
        ),
      ),
    );
  });

  it("4. professor (dono da sala) lê a tentativa de um aluno da sua sala", async () => {
    await assertSucceeds(getDoc(doc(teacher(), `attempts/${ATTEMPT_ID}`)));
  });

  it("5. professor de outra sala não lê a tentativa", async () => {
    await assertFails(getDoc(doc(otherTeacher(), `attempts/${ATTEMPT_ID}`)));
  });

  it("6. client não cria/edita/deleta attempts direto (só Cloud Function)", async () => {
    await assertFails(
      setDoc(doc(student(), "attempts/novo"), {
        assignmentId: ASSIGNMENT_ID,
        classId: CLASS_ID,
        studentId: STUDENT,
        status: "IN_PROGRESS",
      }),
    );
    await assertFails(
      updateDoc(doc(student(), `attempts/${ATTEMPT_ID}`), { status: "GRADED" }),
    );
  });

  it("7. aluno dono escreve answers enquanto IN_PROGRESS", async () => {
    await assertSucceeds(
      setDoc(doc(student(), `attempts/${ATTEMPT_ID}/answers/item-1`), {
        answerPayload: { selectedIndex: 1 },
      }),
    );
  });

  it("8. aluno dono não escreve answers depois de GRADED", async () => {
    await assertFails(
      setDoc(doc(student(), `attempts/${GRADED_ATTEMPT_ID}/answers/item-1`), {
        answerPayload: { selectedIndex: 1 },
      }),
    );
  });

  it("9. aluno lê attemptResults da própria tentativa quando resultsReleased == true", async () => {
    await assertSucceeds(
      getDoc(doc(student(), `attemptResults/${RELEASED_ATTEMPT_ID}`)),
    );
  });

  it("10. aluno NÃO lê attemptResults da própria tentativa quando resultsReleased == false", async () => {
    await assertFails(
      getDoc(doc(student(), `attemptResults/${GRADED_ATTEMPT_ID}`)),
    );
  });

  it("11. professor lê attemptResults de qualquer aluno da sua sala, mesmo sem liberar", async () => {
    await assertSucceeds(
      getDoc(doc(teacher(), `attemptResults/${GRADED_ATTEMPT_ID}`)),
    );
  });

  it("12. outro professor não lê attemptResults", async () => {
    await assertFails(
      getDoc(doc(otherTeacher(), `attemptResults/${GRADED_ATTEMPT_ID}`)),
    );
  });

  it("13. client não escreve attemptResults (só Cloud Function)", async () => {
    await assertFails(
      setDoc(doc(teacher(), `attemptResults/${GRADED_ATTEMPT_ID}`), {
        score: 999,
      }),
    );
  });

  it("14. client não lista attemptResults (sem tela de histórico nesta fase)", async () => {
    await assertFails(
      getDocs(
        query(
          collection(student(), "attemptResults"),
          where("studentId", "==", STUDENT),
        ),
      ),
    );
  });
});
