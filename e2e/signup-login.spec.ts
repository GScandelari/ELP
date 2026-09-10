import { expect, test } from "@playwright/test";

const PING =
  "http://127.0.0.1:5001/demo-elp/southamerica-east1/ping";

// O emulador de Functions demora a subir mesmo depois da UI (:4000).
test.beforeAll(async ({ request }) => {
  await expect(async () => {
    const r = await request.get(PING);
    expect(r.ok()).toBeTruthy();
  }).toPass({ timeout: 90_000, intervals: [1000] });
});

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@e2e.local`;
}

async function registerTeacher(page: import("@playwright/test").Page, email: string) {
  await page.goto("/cadastro");
  await page.getByRole("button", { name: "Professor" }).click();
  await page.getByLabel("Nome completo").fill("Prof E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/Senha/).fill("senha123456");
  await page.getByRole("checkbox").first().check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
}

test("professor: cadastro leva ao painel com papel teacher", async ({ page }) => {
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

  await expect(page.getByText(/criadas pelo professor ou pela escola/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar conta" })).toHaveCount(0);
});
