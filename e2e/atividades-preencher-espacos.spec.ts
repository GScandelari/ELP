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

test("professor: monta uma atividade de preencher espaços (Activity Engine, RF-009)", async ({
  page,
}) => {
  await registerTeacher(page, uniqueEmail("prof"));
  await createActivity(page, "Preencher espaços", "Rotina diária");

  // sem item, o construtor real (não o placeholder) já aparece
  await expect(page.getByText("O construtor de itens para")).toHaveCount(0);

  // adiciona um item: marca "wake" como espaço, modo TYPING
  await page.getByRole("button", { name: "Adicionar item" }).click();
  const itemDialog = page.getByRole("dialog");
  await itemDialog.getByLabel("Texto").fill("I usually wake up at 7 o'clock.");
  await itemDialog.getByRole("button", { name: "wake", exact: true }).click();
  await itemDialog.getByLabel("Pontos").fill("3");
  await itemDialog.getByRole("button", { name: "Salvar" }).click();
  await expect(itemDialog).toBeHidden();

  await expect(page.getByText("Itens (1)")).toBeVisible();
  await expect(
    page.getByText("I usually [wake] up at 7 o'clock."),
  ).toBeVisible();
  await expect(page.getByText("Digitar a resposta")).toBeVisible();
  await expect(page.getByText("3 pontos")).toBeVisible();

  await publishActivity(page);

  // pré-visualização do aluno: mostra o texto, mas sem revelar a resposta
  await showStudentPreview(page);
  await expect(page.getByText("[wake]")).toHaveCount(1); // só no builder acima
  await expect(page.locator("input:disabled").first()).toBeVisible();
});
