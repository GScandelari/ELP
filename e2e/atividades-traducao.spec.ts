import { expect, test } from "@playwright/test";
import {
  addChoiceItem,
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
  await addChoiceItem(
    page,
    "Adicionar item",
    [
      { label: "Palavra ou frase a traduzir", value: "casa" },
      { label: "Opção 1", value: "house" },
      { label: "Opção 2", value: "car" },
    ],
    "Opção 1 é a correta",
    "2",
  );

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
