import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

const PING = "http://127.0.0.1:5001/demo-elp/southamerica-east1/ping";

/** O emulador de Functions demora a subir mesmo depois da UI (:4000). */
export async function waitForFunctionsEmulator() {
  await expect(async () => {
    const r = await fetch(PING);
    expect(r.ok).toBeTruthy();
  }).toPass({ timeout: 90_000, intervals: [1000] });
}

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${randomUUID().slice(0, 8)}@e2e.local`;
}

export async function registerTeacher(page: Page, email: string) {
  await page.goto("/cadastro");
  await page.getByRole("button", { name: "Professor" }).click();
  await page.getByLabel("Nome completo").fill("Prof E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/Senha/).fill("senha123456");
  await page.getByRole("checkbox").first().check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
}
