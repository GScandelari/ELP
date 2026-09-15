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

test("professor: monta uma atividade de múltipla escolha (Activity Engine, RF-009)", async ({
  page,
}) => {
  await registerTeacher(page, uniqueEmail("prof"));
  await createActivity(page, "Múltipla escolha", "Capitais");

  // primeira questão
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

  await expect(page.getByText("Itens (1)")).toBeVisible();
  await expect(page.getByText("Qual é a capital da França?")).toBeVisible();
  await expect(page.getByText("✓ Paris")).toBeVisible();
  await expect(page.getByText("2 pontos")).toBeVisible();

  // com item, já dá pra marcar como pronta
  await publishActivity(page);

  // segunda questão
  await addChoiceItem(
    page,
    "Adicionar questão",
    [
      { label: "Enunciado", value: "Qual é a capital do Japão?" },
      { label: "Alternativa 1", value: "Pequim" },
      { label: "Alternativa 2", value: "Tóquio" },
    ],
    "Alternativa 2 é a correta",
  );
  await expect(page.getByText("Itens (2)")).toBeVisible();

  // reordena: a segunda questão sobe para o primeiro lugar
  const items = page
    .getByRole("list", { name: "Questões cadastradas" })
    .getByRole("listitem");
  await expect(items.first()).toContainText("Qual é a capital da França?");
  await items
    .filter({ hasText: "Qual é a capital do Japão?" })
    .getByRole("button", { name: "Mover para cima" })
    .click();
  await expect(items.first()).toContainText("Qual é a capital do Japão?");

  // pré-visualização do aluno não mostra a resposta certa (só o builder,
  // acima, mostra — a contagem do marcador "✓" não pode dobrar ao abrir)
  await expect(page.getByText("✓ Tóquio")).toHaveCount(1);
  await showStudentPreview(page);
  await expect(page.getByText("Tóquio").last()).toBeVisible();
  await expect(page.getByText("✓ Tóquio")).toHaveCount(1);

  // edita a primeira questão
  await items
    .filter({ hasText: "Qual é a capital da França?" })
    .getByRole("button", { name: "Editar" })
    .click();
  const itemDialog = page.getByRole("dialog");
  await itemDialog
    .getByLabel("Enunciado")
    .fill("Qual é a capital da França? (revisado)");
  await itemDialog.getByRole("button", { name: "Salvar" }).click();
  await expect(itemDialog).toBeHidden();
  await expect(
    items.filter({ hasText: "Qual é a capital da França? (revisado)" }),
  ).toBeVisible();

  // remove uma questão
  page.once("dialog", (d) => d.accept());
  await items
    .filter({ hasText: "capital do Japão" })
    .getByRole("button", { name: "Remover" })
    .click();
  await expect(page.getByText("Itens (1)")).toBeVisible();
});
