import { expect, test } from "@playwright/test";
import {
  registerTeacher,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

test("professor: cadastro leva ao painel com papel teacher", async ({
  page,
}) => {
  await registerTeacher(page, uniqueEmail("prof"));

  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByTestId("painel-role")).toHaveText("teacher");
});

test("professor: logout e login de volta", async ({ page }) => {
  const email = uniqueEmail("prof");
  await registerTeacher(page, email);
  await expect(page).toHaveURL(/\/painel$/);

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByTestId("painel-role")).toHaveText("teacher");
});

test("aluno menor de 18: cadastro self-service bloqueado", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByRole("button", { name: "Aluno" }).click();
  await page.getByRole("button", { name: "Não" }).click();

  await expect(
    page.getByText(/criadas pelo professor ou pela escola/i),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar conta" })).toHaveCount(
    0,
  );
});
