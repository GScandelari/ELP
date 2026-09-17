import { expect, test } from "@playwright/test";
import {
  expectNoA11yViolations,
  registerTeacher,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

test("professor: cria, edita e arquiva uma atividade no repositório (RF-008/RF-010/RF-011)", async ({
  page,
}) => {
  await registerTeacher(page, uniqueEmail("prof"));
  await page.getByRole("link", { name: "Minhas atividades" }).click();
  await expect(page).toHaveURL(/\/atividades$/);
  await expect(
    page.getByText("Você ainda não criou nenhuma atividade."),
  ).toBeVisible();
  await expectNoA11yViolations(page); // RNF-007 - repositório de atividades

  await page.getByRole("button", { name: "Nova atividade" }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog
    .getByLabel("Tipo")
    .selectOption({ label: "Múltipla escolha" });
  await createDialog.getByLabel("Título").fill("Verbos irregulares");
  await createDialog
    .getByLabel("Descrição (opcional)")
    .fill("Passado simples dos verbos mais comuns");
  await createDialog.getByLabel("Dificuldade").selectOption({ label: "Médio" });
  await createDialog.getByLabel(/Tags/).fill("gramática, passado simples");
  await createDialog.getByRole("button", { name: "Criar atividade" }).click();

  await expect(page).toHaveURL(/\/atividades\/[^/]+$/);
  await expect(
    page.getByRole("heading", { name: "Verbos irregulares" }),
  ).toBeVisible();
  await expect(
    page.getByText("Passado simples dos verbos mais comuns"),
  ).toBeVisible();
  await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
  await expectNoA11yViolations(page); // RNF-007 - tela da atividade (Builder)

  // sem item ainda -> não dá pra marcar como pronta
  await expect(
    page.getByRole("button", { name: "Marcar como pronta" }),
  ).toBeDisabled();

  // editar metadados
  await page.getByRole("button", { name: "Editar" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Título").fill("Verbos irregulares — passado");
  await editDialog.getByRole("button", { name: "Salvar" }).click();
  await expect(editDialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Verbos irregulares — passado" }),
  ).toBeVisible();

  // arquivar e reativar
  await page.getByRole("button", { name: "Arquivar" }).click();
  await expect(page.getByText("Arquivada", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reativar como rascunho" }).click();
  await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();

  // aparece na lista do repositório
  await page.getByRole("link", { name: "← Minhas atividades" }).click();
  await expect(
    page.getByRole("heading", { name: "Verbos irregulares — passado" }),
  ).toBeVisible();
});
