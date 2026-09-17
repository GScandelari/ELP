import type { Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { purgeExpiredDataOnce } from "../src/privacy/purge-expired-data";
import { clearFirestoreEmulator, cleanupTestApp, initTestApp } from "./helpers";

let db: Firestore;

beforeAll(() => {
  db = initTestApp();
});

afterAll(() => cleanupTestApp());

beforeEach(() => clearFirestoreEmulator());

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

async function seedAuditLog(id: string, timestamp: Date) {
  await db.doc(`auditLog/${id}`).set({
    uid: "u1",
    action: "exportUserData",
    ip: null,
    timestamp,
  });
}

async function seedUser(uid: string, overrides: Record<string, unknown> = {}) {
  await db.doc(`users/${uid}`).set({
    name: "Usuário",
    email: null,
    role: "student",
    status: "ACTIVE",
    updatedAt: new Date(),
    ...overrides,
  });
}

async function seedConsent(uid: string, recordId: string) {
  await db.doc(`consents/${uid}/records/${recordId}`).set({
    type: "TERMS",
    textVersion: "1.0",
  });
}

describe("purgeExpiredDataOnce (integração)", () => {
  it("apaga auditLog com mais de 6 meses, mantém o resto", async () => {
    await seedAuditLog("velho", new Date(Date.now() - SIX_MONTHS_MS - DAY_MS));
    await seedAuditLog("recente", new Date(Date.now() - DAY_MS));

    const result = await purgeExpiredDataOnce();
    expect(result.auditLogPurged).toBe(1);

    expect((await db.doc("auditLog/velho").get()).exists).toBe(false);
    expect((await db.doc("auditLog/recente").get()).exists).toBe(true);
  });

  it("apaga consents de conta anonimizada há mais de 5 anos", async () => {
    await seedUser("aluno-1", {
      status: "DELETED",
      updatedAt: new Date(Date.now() - FIVE_YEARS_MS - DAY_MS),
    });
    await seedConsent("aluno-1", "r1");
    await seedConsent("aluno-1", "r2");

    const result = await purgeExpiredDataOnce();
    expect(result.consentsPurged).toBe(2);

    const recordsSnap = await db.collection("consents/aluno-1/records").get();
    expect(recordsSnap.empty).toBe(true);
  });

  it("não toca consents de conta anonimizada há menos de 5 anos", async () => {
    await seedUser("aluno-1", {
      status: "DELETED",
      updatedAt: new Date(Date.now() - DAY_MS),
    });
    await seedConsent("aluno-1", "r1");

    const result = await purgeExpiredDataOnce();
    expect(result.consentsPurged).toBe(0);

    expect((await db.doc("consents/aluno-1/records/r1").get()).exists).toBe(
      true,
    );
  });

  it("nunca toca consents de conta ativa, mesmo com updatedAt antigo", async () => {
    await seedUser("prof-1", {
      status: "ACTIVE",
      updatedAt: new Date(Date.now() - FIVE_YEARS_MS - DAY_MS),
    });
    await seedConsent("prof-1", "r1");

    const result = await purgeExpiredDataOnce();
    expect(result.consentsPurged).toBe(0);

    expect((await db.doc("consents/prof-1/records/r1").get()).exists).toBe(
      true,
    );
  });

  it("não faz nada quando não há nada elegível", async () => {
    const result = await purgeExpiredDataOnce();
    expect(result).toEqual({ auditLogPurged: 0, consentsPurged: 0 });
  });
});
