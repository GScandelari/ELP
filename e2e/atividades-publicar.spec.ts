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

test("professor: atribui uma atividade pronta a uma sala (RF-011, RN-012)", async ({
  page,
}) => {
  await registerTeacher(page, uniqueEmail("prof"));

  // cria uma sala pra atribuir depois
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("button", { name: "Criar sala" }).click();
  const classDialog = page.getByRole("dialog");
  await classDialog.getByLabel("Nome").fill("Inglês 6º ano");
  await classDialog.getByRole("button", { name: "Criar sala" }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+$/);

  // cria uma atividade de múltipla escolha, com um item, e marca como pronta
  // ("Minhas atividades" só existe a partir do painel, não da tela da sala)
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

  // atribui a sala criada acima
  await page.getByRole("button", { name: "Atribuir a sala(s)" }).click();
  const publishDialog = page.getByRole("dialog");
  await publishDialog.getByLabel("Inglês 6º ano").check();
  await publishDialog.getByLabel("Máximo de tentativas").fill("2");
  await publishDialog.getByRole("button", { name: "Atribuir" }).click();
  await expect(publishDialog).toBeHidden();

  // confere na sala: a atividade aparece na lista de atribuídas
  await page.getByRole("link", { name: "ELP" }).click();
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: "Inglês 6º ano" }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+$/);

  await expect(page.getByText("Atividades atribuídas (1)")).toBeVisible();
  await expect(page.getByText("Capitais")).toBeVisible();
  await expect(page.getByText("Múltipla escolha")).toBeVisible();
  await expect(page.getByText("Publicada")).toBeVisible();
  await expect(page.getByText("2 tentativas")).toBeVisible();

  // conteúdo congelado: mostra o enunciado, sem revelar a resposta certa
  await page.getByRole("button", { name: "Mostrar conteúdo" }).click();
  await expect(page.getByText("Qual é a capital da França?")).toBeVisible();
  await expect(page.getByText("Paris")).toBeVisible();
  await expect(page.getByText("✓ Paris")).toHaveCount(0);
});
