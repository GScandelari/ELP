import { expect, test } from "@playwright/test";
import {
  addChoiceItem,
  createActivity,
  publishActivity,
  registerTeacher,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

test("professor: clona uma atividade e substitui a atribuição numa sala sem tentativas (RF-022, ADR-014)", async ({
  page,
}) => {
  await registerTeacher(page, uniqueEmail("prof"));

  // cria uma sala
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("button", { name: "Criar sala" }).click();
  const classDialog = page.getByRole("dialog");
  await classDialog.getByLabel("Nome").fill("Inglês 6º ano");
  await classDialog.getByRole("button", { name: "Criar sala" }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+$/);

  // cria a atividade original, com um item, marca pronta e atribui à sala
  await page.getByRole("link", { name: "ELP" }).click();
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
  await page.getByRole("button", { name: "Atribuir a sala(s)" }).click();
  const publishDialog = page.getByRole("dialog");
  await publishDialog.getByLabel("Inglês 6º ano").check();
  await publishDialog.getByRole("button", { name: "Atribuir" }).click();
  await expect(publishDialog).toBeHidden();

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
