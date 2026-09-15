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

/** Cria uma sala a partir de "Minhas salas" e cai na tela dela. */
export async function createClass(page: Page, name: string) {
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("button", { name: "Criar sala" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome").fill(name);
  await dialog.getByRole("button", { name: "Criar sala" }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+$/);
}

/**
 * Abre "Atribuir a sala(s)" (já na tela da atividade), marca as salas
 * dadas pelo nome e confirma.
 */
export async function assignActivityToClasses(
  page: Page,
  classNames: string[],
  options: { maxAttempts?: string } = {},
) {
  await page.getByRole("button", { name: "Atribuir a sala(s)" }).click();
  const dialog = page.getByRole("dialog");
  for (const className of classNames) {
    await dialog.getByLabel(className).check();
  }
  if (options.maxAttempts) {
    await dialog.getByLabel("Máximo de tentativas").fill(options.maxAttempts);
  }
  await dialog.getByRole("button", { name: "Atribuir" }).click();
  await expect(dialog).toBeHidden();
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

/**
 * Adiciona um item de um tipo "escolha a alternativa certa" (Multiple
 * Choice, Translation): abre o diálogo, preenche os campos na ordem
 * dada, marca a alternativa certa, opcionalmente ajusta os pontos e
 * salva. `fields` inclui o campo de topo (enunciado/frase) e as
 * alternativas.
 */
export async function addChoiceItem(
  page: Page,
  addButtonName: string,
  fields: { label: string; value: string }[],
  correctLabel: string,
  points?: string,
) {
  await page.getByRole("button", { name: addButtonName }).click();
  const itemDialog = page.getByRole("dialog");
  for (const field of fields) {
    await itemDialog.getByLabel(field.label, { exact: true }).fill(field.value);
  }
  await itemDialog.getByLabel(correctLabel).check();
  if (points) {
    await itemDialog.getByLabel("Pontos").fill(points);
  }
  await itemDialog.getByRole("button", { name: "Salvar" }).click();
  await expect(itemDialog).toBeHidden();
}

/**
 * Aluno entra numa sala pelo código e navega até um assignment
 * específico dentro dela (UC-006 passos 1-2) — compartilhado pelos
 * specs de "resolver" de cada tipo (um por PR, 4.3-4.6).
 */
export async function joinClassAndOpenAssignment(
  page: Page,
  studentEmail: string,
  code: string,
  className: string,
  activityTitle: string,
) {
  await registerStudent(page, studentEmail);
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: "Entrar em sala" }).click();
  await page.getByLabel("Código da sala").fill(code);
  await page.getByRole("button", { name: "Entrar na sala" }).click();
  await page.getByRole("link", { name: className }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+$/);
  await page.getByRole("link", { name: activityTitle }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+\/atividades\/[^/]+$/);
}

/** Professor loga, entra na sala e libera os resultados de um assignment (RF-017/ADR-013). */
export async function releaseResultsAsTeacher(
  page: Page,
  teacherEmail: string,
  className: string,
) {
  await login(page, teacherEmail);
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: className }).click();
  await page.getByRole("button", { name: "Liberar resultados" }).click();
  await expect(page.getByText("resultados liberados")).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();
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
