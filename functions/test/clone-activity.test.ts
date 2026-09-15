import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cloneActivity } from "../src/activities/clone-activity";
import {
  clearFirestoreEmulator,
  cleanupTestApp,
  initTestApp,
  wrapCallable,
} from "./helpers";

type Payload = { activityId?: unknown };
type Result = { activityId: string };

let db: Firestore;
let call: ReturnType<typeof wrapCallable<Payload, Result>>;

beforeAll(() => {
  db = initTestApp();
  call = wrapCallable(cloneActivity);
});

afterAll(() => cleanupTestApp());

beforeEach(() => clearFirestoreEmulator());

const TEACHER = { uid: "prof-1", token: { role: "teacher" } };
const OTHER_TEACHER = { uid: "prof-2", token: { role: "teacher" } };

async function seedActivity(
  id: string,
  accountId: string,
  overrides: Record<string, unknown> = {},
) {
  await db.doc(`activities/${id}`).set({
    accountId,
    title: "Capitais",
    description: "Sobre capitais",
    type: "MULTIPLE_CHOICE",
    difficulty: "EASY",
    tags: ["geografia"],
    status: "READY",
    locked: false,
    itemCount: 0,
    ...overrides,
  });
}

async function seedItem(activityId: string, itemId: string, accountId: string) {
  await db.doc(`activities/${activityId}/items/${itemId}`).set({
    accountId,
    position: 0,
    prompt: "Qual é a capital da França?",
    configuration: {
      question: "Qual é a capital da França?",
      options: ["Londres", "Paris"],
      correctIndex: 1,
    },
    points: 2,
  });
}

describe("cloneActivity (integração)", () => {
  it("rejeita chamada sem autenticação", async () => {
    await expect(call({ activityId: "a1" })).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejeita quem não é professor", async () => {
    await expect(
      call(
        { activityId: "a1" },
        { uid: "aluno-1", token: { role: "student" } },
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejeita activityId ausente", async () => {
    await expect(call({}, TEACHER)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("rejeita atividade inexistente", async () => {
    await expect(
      call({ activityId: "nao-existe" }, TEACHER),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("rejeita atividade de outro professor", async () => {
    await seedActivity("a1", OTHER_TEACHER.uid);
    await expect(call({ activityId: "a1" }, TEACHER)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("clona metadados + itens, nascendo DRAFT/desbloqueada", async () => {
    await seedActivity("a1", TEACHER.uid);
    await seedItem("a1", "i1", TEACHER.uid);
    await seedItem("a1", "i2", TEACHER.uid);

    const res = await call({ activityId: "a1" }, TEACHER);
    expect(res.activityId).toBeTruthy();
    expect(res.activityId).not.toBe("a1");

    const cloneSnap = await db.doc(`activities/${res.activityId}`).get();
    const clone = cloneSnap.data()!;
    expect(clone.title).toBe("Capitais (v2)");
    expect(clone.description).toBe("Sobre capitais");
    expect(clone.type).toBe("MULTIPLE_CHOICE");
    expect(clone.tags).toEqual(["geografia"]);
    expect(clone.status).toBe("DRAFT");
    expect(clone.locked).toBe(false);
    expect(clone.lockedAt).toBeNull();
    expect(clone.clonedFrom).toBe("a1");
    expect(clone.itemCount).toBe(2);
    expect(clone.accountId).toBe(TEACHER.uid);

    const itemsSnap = await db
      .collection(`activities/${res.activityId}/items`)
      .get();
    expect(itemsSnap.size).toBe(2);
    for (const doc of itemsSnap.docs) {
      expect(doc.get("accountId")).toBe(TEACHER.uid);
      expect(doc.get("configuration")).toEqual({
        question: "Qual é a capital da França?",
        options: ["Londres", "Paris"],
        correctIndex: 1,
      });
    }
  });

  it("clona mesmo uma atividade travada ou sem itens", async () => {
    await seedActivity("a1", TEACHER.uid, {
      status: "LOCKED",
      locked: true,
    });
    const res = await call({ activityId: "a1" }, TEACHER);
    const cloneSnap = await db.doc(`activities/${res.activityId}`).get();
    expect(cloneSnap.get("status")).toBe("DRAFT");
    expect(cloneSnap.get("locked")).toBe(false);
    expect(cloneSnap.get("itemCount")).toBe(0);
  });

  it("incrementa a versão quando já existe um clone", async () => {
    await seedActivity("a1", TEACHER.uid);

    const first = await call({ activityId: "a1" }, TEACHER);
    const firstSnap = await db.doc(`activities/${first.activityId}`).get();
    expect(firstSnap.get("title")).toBe("Capitais (v2)");

    // clonar de novo a partir do original — escaneia todas as atividades
    // do professor, não só a de origem, e continua a partir do maior "vN"
    const second = await call({ activityId: "a1" }, TEACHER);
    const secondSnap = await db.doc(`activities/${second.activityId}`).get();
    expect(secondSnap.get("title")).toBe("Capitais (v3)");
  });
});
