import { expect, test } from "@playwright/test";
import {
  addChoiceItem,
  assignActivityToClasses,
  createActivity,
  createClass,
  publishActivity,
  registerTeacher,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

/**
 * Fecha a Fase 3: cobre o critério de saída literal do plano — "professor
 * cria uma atividade de cada tipo, atribui a duas salas, clona uma
 * atividade e substitui a atribuição numa sala sem tentativas" — e soma
 * o encerrar (RF-011, escopo próprio da PR 3.9).
 */
test("professor: fluxo completo da Fase 3 — cada tipo, duas salas, clone, aplicar versão, encerrar", async ({
  page,
}) => {
  await registerTeacher(page, uniqueEmail("prof"));

  // cria uma atividade de cada um dos 4 tipos do MVP, todas prontas
  await createActivity(page, "Múltipla escolha", "Capitais");
  await addChoiceItem(
    page,
    "Adicionar questão",
    [
      { label: "Enunciado", value: "Qual é a capital da França?" },
      { label: "Alternativa 1", value: "Londres" },
      { label: "Alternativa 2", value: "Paris" },
    ],
    "Alternativa 2 é a correta",
    "2",
  );
  await publishActivity(page);

  await page.getByRole("link", { name: "ELP" }).click();
  await createActivity(page, "Preencher espaços", "Rotina diária");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  let itemDialog = page.getByRole("dialog");
  await itemDialog.getByLabel("Texto").fill("I like to read books.");
  await itemDialog.getByRole("button", { name: "read", exact: true }).click();
  await itemDialog.getByRole("button", { name: "Salvar" }).click();
  await expect(itemDialog).toBeHidden();
  await publishActivity(page);

  await page.getByRole("link", { name: "ELP" }).click();
  await createActivity(page, "Tradução/localização", "Vocabulário básico");
  await addChoiceItem(
    page,
    "Adicionar item",
    [
      { label: "Palavra ou frase a traduzir", value: "casa" },
      { label: "Opção 1", value: "house" },
      { label: "Opção 2", value: "car" },
    ],
    "Opção 1 é a correta",
  );
  await publishActivity(page);

  await page.getByRole("link", { name: "ELP" }).click();
  await createActivity(
    page,
    "Relacionamento de significados",
    "Animais e cores",
  );
  await page.getByRole("button", { name: "Adicionar item" }).click();
  itemDialog = page.getByRole("dialog");
  await itemDialog.getByLabel("Termo 1").fill("cat");
  await itemDialog.getByLabel("Significado 1").fill("gato");
  await itemDialog.getByLabel("Termo 2").fill("dog");
  await itemDialog.getByLabel("Significado 2").fill("cachorro");
  await itemDialog.getByRole("button", { name: "Salvar" }).click();
  await expect(itemDialog).toBeHidden();
  await publishActivity(page);

  // cria as duas salas
  await page.getByRole("link", { name: "ELP" }).click();
  await createClass(page, "Turma A");
  await page.getByRole("link", { name: "ELP" }).click();
  await createClass(page, "Turma B");

  // atribui a atividade de múltipla escolha às DUAS salas de uma vez (RN-012)
  await page.getByRole("link", { name: "ELP" }).click();
  await page.getByRole("link", { name: "Minhas atividades" }).click();
  await page.getByRole("link", { name: "Capitais" }).click();
  await assignActivityToClasses(page, ["Turma A", "Turma B"]);

  // clona a atividade e marca a cópia como pronta
  await page.getByRole("button", { name: "Clonar" }).click();
  await expect(page).toHaveURL(/\/atividades\/[^/]+$/);
  await expect(
    page.getByRole("heading", { name: "Capitais (v2)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Marcar como pronta" }).click();
  await expect(page.getByText("Pronta", { exact: true })).toBeVisible();

  // aplica a nova versão só na Turma A — a Turma B fica na original
  await page.getByRole("button", { name: "Aplicar esta versão" }).click();
  const applyDialog = page.getByRole("dialog");
  await applyDialog.getByLabel("Turma A").check();
  await applyDialog.getByRole("button", { name: "Aplicar" }).click();
  await expect(applyDialog).toBeHidden();

  // confere: Turma A tem a v2, Turma B continua com a original
  await page.getByRole("link", { name: "ELP" }).click();
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: "Turma A" }).click();
  await expect(page.getByText("Capitais (v2)")).toBeVisible();

  await page.getByRole("link", { name: "ELP" }).click();
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: "Turma B" }).click();
  await expect(
    page.getByText("Capitais", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Capitais (v2)")).toHaveCount(0);

  // encerra a atribuição da Turma B (RF-011)
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Encerrar" }).click();
  await expect(page.getByText("Encerrada", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);
});
