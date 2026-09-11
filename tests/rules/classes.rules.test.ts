import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  orderBy,
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
  standardActors,
  STUDENT,
  TEACHER,
} from "./helpers";

let testEnv: RulesTestEnvironment;
let db: ReturnType<typeof contextFactory>;

const CLASS_ID = "class-1";

beforeAll(async () => {
  testEnv = await createRulesTestEnv("demo-elp-classes-rules");
  db = contextFactory(testEnv);
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
      createdAt: new Date(),
    });
    await setDoc(doc(db, `classes/${CLASS_ID}/enrollments/${STUDENT}`), {
      studentId: STUDENT,
      accountId: TEACHER,
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

// wrapper porque `db` só é atribuída dentro do beforeAll (acima) — os
// helpers de standardActors precisam ler o valor atual, não o de quando
// o módulo carregou.
const { teacher, otherTeacher, student, otherStudent } = standardActors(
  (uid, claims) => db(uid, claims),
);

describe("firestore.rules — classes (Fase 2 / RN-004)", () => {
  it("1. professor dono lê a própria sala", async () => {
    await assertSucceeds(getDoc(doc(teacher(), `classes/${CLASS_ID}`)));
  });

  it("2. outro professor não lê a sala", async () => {
    await assertFails(getDoc(doc(otherTeacher(), `classes/${CLASS_ID}`)));
  });

  it("2b. professor lista (list) as próprias salas por accountId", async () => {
    // regressão: a regra usava get() em vez de resource.data, o que falhava
    // com "Null value error" numa query de list (ver PR 2.2)
    const q = query(
      collection(teacher(), "classes"),
      where("accountId", "==", TEACHER),
      orderBy("createdAt", "desc"),
    );
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.size).toBe(1);
  });

  it("2c. outro professor lista as próprias salas e não vê a de teacher-1", async () => {
    const q = query(
      collection(otherTeacher(), "classes"),
      where("accountId", "==", OTHER_TEACHER),
      orderBy("createdAt", "desc"),
    );
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.size).toBe(0);
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

  it("13. aluno lista (collection group) as próprias inscrições em qualquer sala", async () => {
    const q = query(
      collectionGroup(student(), "enrollments"),
      where("studentId", "==", STUDENT),
    );
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.size).toBe(1);
  });

  it("14. aluno não consegue listar (collection group) as inscrições de outro", async () => {
    const q = query(
      collectionGroup(otherStudent(), "enrollments"),
      where("studentId", "==", STUDENT),
    );
    await assertFails(getDocs(q));
  });

  it("15. professor lista o roster da própria sala (subcoleção)", async () => {
    const q = query(
      collection(teacher(), `classes/${CLASS_ID}/enrollments`),
      where("accountId", "==", TEACHER),
    );
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.size).toBe(1);
  });

  it("16. outro professor não consegue listar o roster filtrando pelo accountId do dono", async () => {
    const q = query(
      collection(otherTeacher(), `classes/${CLASS_ID}/enrollments`),
      where("accountId", "==", TEACHER), // tenta "espiar" usando o id do dono real
    );
    await assertFails(getDocs(q));
  });

  it("17. GUARDIAN_CONSENT é imutável para o client (só addStudentToClass grava)", async () => {
    await assertFails(
      setDoc(doc(teacher(), `consents/${STUDENT}/records/r1`), {
        type: "GUARDIAN_CONSENT",
        grantedByRole: "teacher",
        grantedByUid: TEACHER,
        guardianName: "Responsável",
      }),
    );
  });
});
