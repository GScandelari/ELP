import { expect, test } from "@playwright/test";
import {
  registerStudent,
  registerTeacher,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

test("aluno: entra em sala pelo código e a sala aparece na lista", async ({
  page,
}) => {
  // professor cria a sala e pega o código
  await registerTeacher(page, uniqueEmail("prof"));
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("button", { name: "Criar sala" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome").fill("Inglês básico");
  await dialog.getByRole("button", { name: "Criar sala" }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+$/);

  const code = await page.getByText(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/).innerText();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);

  // aluno maior se cadastra e ainda não está em nenhuma sala
  await registerStudent(page, uniqueEmail("aluno"));
  await expect(page).toHaveURL(/\/painel$/);
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await expect(
    page.getByText("Você ainda não está em nenhuma sala."),
  ).toBeVisible();

  // entra pelo código
  await page.getByRole("link", { name: "Entrar em sala" }).click();
  await expect(page).toHaveURL(/\/salas\/entrar$/);
  await page.getByLabel("Código da sala").fill(code);
  await page.getByRole("button", { name: "Entrar na sala" }).click();

  await expect(page.getByText(/Você entrou em/)).toBeVisible();
  await expect(page).toHaveURL(/\/salas$/);
  await expect(
    page.getByRole("heading", { name: "Inglês básico" }),
  ).toBeVisible();

  // segunda tentativa com o mesmo código mostra erro amigável (RN-003)
  await page.getByRole("link", { name: "Entrar em sala" }).click();
  await page.getByLabel("Código da sala").fill(code);
  await page.getByRole("button", { name: "Entrar na sala" }).click();
  await expect(page.getByText("Você já está nesta sala.")).toBeVisible();
});
