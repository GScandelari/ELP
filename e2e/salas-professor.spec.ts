import { expect, test } from "@playwright/test";
import {
  registerTeacher,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

test("professor: cria sala e vê o código de inscrição", async ({ page }) => {
  await registerTeacher(page, uniqueEmail("prof"));
  await expect(page).toHaveURL(/\/painel$/);

  await page.getByRole("link", { name: "Minhas salas" }).click();
  await expect(page).toHaveURL(/\/salas$/);
  await expect(
    page.getByText("Você ainda não criou nenhuma sala."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Criar sala" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome").fill("Inglês 6º ano");
  await dialog.getByLabel("Descrição (opcional)").fill("Turma da manhã");
  await dialog.getByRole("button", { name: "Criar sala" }).click();

  await expect(page).toHaveURL(/\/salas\/[^/]+$/);
  await expect(
    page.getByRole("heading", { name: "Inglês 6º ano" }),
  ).toBeVisible();
  await expect(page.getByText("Turma da manhã")).toBeVisible();

  // código no formato canônico "ABC-234" (letras/dígitos do alfabeto sem ambíguos)
  await expect(page.getByText(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/)).toBeVisible();

  // volta para a lista e a sala criada aparece no card
  await page.getByRole("link", { name: "← Minhas salas" }).click();
  await expect(page).toHaveURL(/\/salas$/);
  await expect(
    page.getByRole("heading", { name: "Inglês 6º ano" }),
  ).toBeVisible();
});
