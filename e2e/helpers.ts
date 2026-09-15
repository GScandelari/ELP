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

export async function login(
  page: Page,
  email: string,
  password = "senha123456",
) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Cria uma atividade a partir de "Minhas atividades" e cai na tela dela. */
export async function createActivity(
  page: Page,
  typeLabel: string,
  title: string,
) {
  await page.getByRole("link", { name: "Minhas atividades" }).click();
  await page.getByRole("button", { name: "Nova atividade" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tipo").selectOption({ label: typeLabel });
  await dialog.getByLabel("Título").fill(title);
  await dialog.getByRole("button", { name: "Criar atividade" }).click();
  await expect(page).toHaveURL(/\/atividades\/[^/]+$/);
}

/** Marca a atividade (já na tela dela) como pronta. */
export async function publishActivity(page: Page) {
  await page.getByRole("button", { name: "Marcar como pronta" }).click();
  await expect(page.getByText("Pronta", { exact: true })).toBeVisible();
}

/** Abre a pré-visualização do aluno (já na tela da atividade). */
export async function showStudentPreview(page: Page) {
  await page
    .getByRole("button", { name: "Mostrar pré-visualização do aluno" })
    .click();
}

export async function registerStudent(page: Page, email: string) {
  await page.goto("/cadastro");
  await page.getByRole("button", { name: "Aluno" }).click();
  await page.getByRole("button", { name: "Sim" }).click();
  await page.getByLabel("Nome completo").fill("Aluno E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/Senha/).fill("senha123456");
  await page.getByRole("checkbox").first().check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
}
