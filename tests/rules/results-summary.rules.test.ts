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
  where,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextFactory,
  createRulesTestEnv,
  OTHER_TEACHER,
  seedClassWithStudent,
  standardActors,
  STUDENT,
  TEACHER,
} from "./helpers";

let testEnv: RulesTestEnvironment;
let db: ReturnType<typeof contextFactory>;

const CLASS_ID = "class-1";

beforeAll(async () => {
  testEnv = await createRulesTestEnv("demo-elp-results-summary-rules");
  db = contextFactory(testEnv);
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await seedClassWithStudent(db, CLASS_ID, TEACHER, STUDENT);
    await setDoc(doc(db, `classes/${CLASS_ID}/resultsSummary/${STUDENT}`), {
      accountId: TEACHER,
      assignmentScores: {
        "assignment-1": { score: 4, maxScore: 4, submittedAt: new Date() },
      },
      updatedAt: new Date(),
    });
  });
});

afterAll(() => testEnv.cleanup());

describe("firestore.rules — resultsSummary (Fase 5)", () => {
  it("1. professor dono lê (get) o resumo de um aluno da própria sala", async () => {
    const { teacher } = standardActors(db);
    await assertSucceeds(
      getDoc(doc(teacher(), `classes/${CLASS_ID}/resultsSummary/${STUDENT}`)),
    );
  });

  it("2. professor dono lista (list) os resumos da própria sala", async () => {
    const { teacher } = standardActors(db);
    const snap = await assertSucceeds(
      getDocs(
        query(
          collection(teacher(), `classes/${CLASS_ID}/resultsSummary`),
          where("accountId", "==", TEACHER),
        ),
      ),
    );
    expect(snap.size).toBe(1);
  });

  it("3. professor de outra sala não lê nem lista", async () => {
    const otherTeacherDb = db(OTHER_TEACHER, { role: "teacher" });
    await assertFails(
      getDoc(
        doc(otherTeacherDb, `classes/${CLASS_ID}/resultsSummary/${STUDENT}`),
      ),
    );
    // filtra pelo accountId real (TEACHER) pra realmente bater com o
    // documento existente — um where(accountId == OTHER_TEACHER) não
    // provaria nada, a query só devolveria vazio sem nem avaliar a regra
    await assertFails(
      getDocs(
        query(
          collection(otherTeacherDb, `classes/${CLASS_ID}/resultsSummary`),
          where("accountId", "==", TEACHER),
        ),
      ),
    );
  });

  it("4. aluno NÃO lê o próprio resumo (nem get, nem list) — resultsSummary não respeita resultsReleased", async () => {
    const studentDb = db(STUDENT, { role: "student" });
    await assertFails(
      getDoc(doc(studentDb, `classes/${CLASS_ID}/resultsSummary/${STUDENT}`)),
    );
    await assertFails(
      getDocs(
        query(
          collection(studentDb, `classes/${CLASS_ID}/resultsSummary`),
          where("accountId", "==", TEACHER),
        ),
      ),
    );
  });

  it("5. cliente não escreve resultsSummary (só a Cloud Function de agregação)", async () => {
    const { teacher } = standardActors(db);
    await assertFails(
      setDoc(doc(teacher(), `classes/${CLASS_ID}/resultsSummary/${STUDENT}`), {
        accountId: TEACHER,
        assignmentScores: {},
      }),
    );
  });
});
