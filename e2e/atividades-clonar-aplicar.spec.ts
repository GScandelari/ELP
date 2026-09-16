import { expect, test } from "@playwright/test";
import {
  setupChoiceActivityAssignedToClass,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

test("professor: clona uma atividade e substitui a atribuição numa sala sem tentativas (RF-022, ADR-014)", async ({
  page,
}) => {
  // cria a sala e a atividade original, com um item, pronta e atribuída
  await setupChoiceActivityAssignedToClass(
    page,
    uniqueEmail("prof"),
    "Inglês 6º ano",
    "Múltipla escolha",
    "Capitais",
    "Adicionar questão",
    [
      { label: "Enunciado", value: "Qual é a capital da França?" },
      { label: "Alternativa 1", value: "Londres" },
      { label: "Alternativa 2", value: "Paris" },
    ],
    "Alternativa 2 é a correta",
    "2",
  );

  // clona a atividade — a cópia já vem com o item, título "(v2)"
  await page.getByRole("button", { name: "Clonar" }).click();
  await expect(page).toHaveURL(/\/atividades\/[^/]+$/);
  await expect(
    page.getByRole("heading", { name: "Capitais (v2)" }),
  ).toBeVisible();
  await expect(page.getByText("Clonada de")).toBeVisible();
  await expect(page.getByText("Itens (1)")).toBeVisible();

  // marca a cópia como pronta e aplica ela na sala que já tinha o original
  await page.getByRole("button", { name: "Marcar como pronta" }).click();
  await expect(page.getByText("Pronta", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Aplicar esta versão" }).click();
  const applyDialog = page.getByRole("dialog");
  await expect(applyDialog.getByText("Inglês 6º ano")).toBeVisible();
  await applyDialog.getByLabel("Inglês 6º ano").check();
  await applyDialog.getByRole("button", { name: "Aplicar" }).click();
  await expect(applyDialog).toBeHidden();

  // confere na sala: a atribuição agora aponta para a versão clonada
  await page.getByRole("link", { name: "ELP" }).click();
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: "Inglês 6º ano" }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+$/);

  await expect(page.getByText("Atividades atribuídas (1)")).toBeVisible();
  await expect(page.getByText("Capitais (v2)")).toBeVisible();
});
