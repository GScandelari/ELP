import { expect, test } from "@playwright/test";
import {
  registerTeacher,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

test("professor: edita, muda status e gera novo código da sala (RF-005)", async ({
  page,
}) => {
  await registerTeacher(page, uniqueEmail("prof"));
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("button", { name: "Criar sala" }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.getByLabel("Nome").fill("Turma Original");
  await createDialog.getByRole("button", { name: "Criar sala" }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+$/);

  const oldCode = await page.getByText(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/).innerText();

  // editar nome e descrição
  await page.getByRole("button", { name: "Editar" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Nome").fill("Turma Editada");
  await editDialog.getByLabel("Descrição (opcional)").fill("Descrição nova");
  await editDialog.getByRole("button", { name: "Salvar" }).click();
  await expect(editDialog).toBeHidden();

  await expect(
    page.getByRole("heading", { name: "Turma Editada" }),
  ).toBeVisible();
  await expect(page.getByText("Descrição nova")).toBeVisible();

  // desativar / reativar
  await expect(page.getByText("Ativa", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Desativar" }).click();
  await expect(page.getByText("Inativa", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Ativar" }).click();
  await expect(page.getByText("Ativa", { exact: true })).toBeVisible();

  // arquivar
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Arquivar" }).click();
  await expect(page.getByText("Arquivada", { exact: true })).toBeVisible();

  // gerar novo código de inscrição invalida o anterior
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Gerar novo código" }).click();
  await expect(async () => {
    const newCode = await page
      .getByText(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/)
      .innerText();
    expect(newCode).not.toBe(oldCode);
  }).toPass();
});
