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

test("professor: monta uma atividade de tradução/localização (Activity Engine, RF-009)", async ({
  page,
}) => {
  await registerTeacher(page, uniqueEmail("prof"));
  await createActivity(page, "Tradução/localização", "Vocabulário básico");

  // sem item, o construtor real (não o placeholder) já aparece
  await expect(page.getByText("O construtor de itens para")).toHaveCount(0);

  // adiciona um item no modo padrão (marcar a alternativa certa)
  await page.getByRole("button", { name: "Adicionar item" }).click();
  const itemDialog = page.getByRole("dialog");
  await itemDialog.getByLabel("Palavra ou frase a traduzir").fill("casa");
  await itemDialog.getByLabel("Opção 1", { exact: true }).fill("house");
  await itemDialog.getByLabel("Opção 2", { exact: true }).fill("car");
  await itemDialog.getByLabel("Opção 1 é a correta").check();
  await itemDialog.getByLabel("Pontos").fill("2");
  await itemDialog.getByRole("button", { name: "Salvar" }).click();
  await expect(itemDialog).toBeHidden();

  await expect(page.getByText("Itens (1)")).toBeVisible();
  await expect(page.getByText("casa")).toBeVisible();
  await expect(page.getByText("✓ house")).toBeVisible();
  await expect(page.getByText("Marcar a alternativa certa")).toBeVisible();
  await expect(page.getByText("2 pontos")).toBeVisible();

  await publishActivity(page);

  // pré-visualização do aluno: mostra as opções, mas sem revelar a certa
  await expect(page.getByText("✓ house")).toHaveCount(1); // só no builder acima
  await showStudentPreview(page);
  await expect(page.getByText("house").last()).toBeVisible();
  await expect(page.getByText("✓ house")).toHaveCount(1);
});
