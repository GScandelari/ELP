import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  login,
  registerStudent,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

/**
 * RF-020/ADR-011 §4: aluno exporta os próprios dados e depois exclui a
 * própria conta pelo portal — a conta deixa de existir (login
 * seguinte falha) e o navegador volta pra /entrar, deslogado.
 */
test("aluno: exporta os próprios dados e exclui a própria conta (RF-020)", async ({
  page,
}) => {
  const studentEmail = uniqueEmail("aluno");

  await registerStudent(page, studentEmail);
  await page.getByRole("link", { name: "Minha conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Meus dados", exact: true }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar meus dados" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^meus-dados-elp-\d+\.json$/);
  const path = await download.path();
  const exported = JSON.parse(readFileSync(path!, "utf-8"));
  expect(exported.account.email).toBe(studentEmail);

  await page
    .getByLabel(`Digite seu e-mail (${studentEmail}) para confirmar`)
    .fill(studentEmail);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir minha conta" }).click();

  // RequireAuth já redireciona pra /entrar assim que o signOut zera o
  // usuário (a mesma guarda de qualquer rota autenticada) - a conta
  // não existe mais, então login com as mesmas credenciais falha
  await expect(page).toHaveURL(/\/entrar$/);
  await login(page, studentEmail);
  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
});
