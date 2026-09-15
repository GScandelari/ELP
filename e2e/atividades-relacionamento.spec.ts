import { expect, test } from "@playwright/test";
import {
  createActivity,
  publishActivity,
  registerTeacher,
  showStudentPreview,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

test("professor: monta uma atividade de relacionamento de significados (Activity Engine, RF-009)", async ({
  page,
}) => {
  await registerTeacher(page, uniqueEmail("prof"));
  await createActivity(
    page,
    "Relacionamento de significados",
    "Animais e cores",
  );

  // sem item, o construtor real (não o placeholder) já aparece
  await expect(page.getByText("O construtor de itens para")).toHaveCount(0);

  // adiciona um item com 2 pares
  await page.getByRole("button", { name: "Adicionar item" }).click();
  const itemDialog = page.getByRole("dialog");
  await itemDialog.getByLabel("Termo 1").fill("cat");
  await itemDialog.getByLabel("Significado 1").fill("gato");
  await itemDialog.getByLabel("Termo 2").fill("dog");
  await itemDialog.getByLabel("Significado 2").fill("cachorro");
  await itemDialog.getByLabel("Pontos").fill("4");
  await itemDialog.getByRole("button", { name: "Salvar" }).click();
  await expect(itemDialog).toBeHidden();

  await expect(page.getByText("Itens (1)")).toBeVisible();
  await expect(page.getByText("cat → gato")).toBeVisible();
  await expect(page.getByText("dog → cachorro")).toBeVisible();
  await expect(page.getByText("4 pontos")).toBeVisible();

  await publishActivity(page);

  // pré-visualização do aluno: mostra os termos, mas sem revelar os pares
  await expect(page.getByText("cat → gato")).toHaveCount(1); // só no builder acima
  await showStudentPreview(page);
  await expect(page.getByText("cat", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("cat → gato")).toHaveCount(1);
});
