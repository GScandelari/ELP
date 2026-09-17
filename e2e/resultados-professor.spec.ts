import { expect, test } from "@playwright/test";
import {
  createAndAssignChoiceActivity,
  createClass,
  joinClassAndOpenAssignment,
  login,
  registerTeacher,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

/**
 * Fecha a Fase 5 (RF-018/UC-007): professor monta e atribui duas
 * atividades, aluno resolve as duas, professor revisita a sala e vê a
 * tabela de resultados certa — sem liberar nada (RN-010: o professor
 * vê a nota real independente de `resultsReleased`).
 */
test("professor: vê a tabela de resultados da sala, sem depender de liberação (RF-018, RN-010)", async ({
  page,
}) => {
  const teacherEmail = uniqueEmail("prof");
  const studentEmail = uniqueEmail("aluno");
  const className = "Turma Completa";

  await registerTeacher(page, teacherEmail);
  await createClass(page, className);
  const code = await page.getByText(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/).innerText();

  await createAndAssignChoiceActivity(
    page,
    [className],
    "Múltipla escolha",
    "Capitais",
    "Adicionar questão",
    [
      { label: "Enunciado", value: "Qual é a capital da França?" },
      { label: "Alternativa 1", value: "Londres" },
      { label: "Alternativa 2", value: "Paris" },
    ],
    "Alternativa 2 é a correta",
    "2",
  );

  await createAndAssignChoiceActivity(
    page,
    [className],
    "Tradução/localização",
    "Vocabulário básico",
    "Adicionar item",
    [
      { label: "Palavra ou frase a traduzir", value: "casa" },
      { label: "Opção 1", value: "house" },
      { label: "Opção 2", value: "car" },
    ],
    "Opção 1 é a correta",
    "2",
  );

  await page.getByRole("button", { name: "Sair" }).click();

  // aluno: entra na sala pelo código e resolve as duas atividades
  await joinClassAndOpenAssignment(
    page,
    studentEmail,
    code,
    className,
    "Capitais",
  );
  await page.getByLabel("Paris (questão 1)").check();
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Tentativa enviada.")).toBeVisible();

  await page.getByRole("link", { name: "← Voltar para a sala" }).click();
  await page.getByRole("link", { name: "Vocabulário básico" }).click();
  await page.getByLabel("house (questão 1)").check();
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Tentativa enviada.")).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();

  // professor: revisita a sala e vê a tabela — nenhum resultado foi liberado
  await login(page, teacherEmail);
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: className }).click();
  await page.getByRole("link", { name: "Ver resultados" }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+\/resultados$/);

  await expect(
    page.getByRole("heading", { name: `Resultados — ${className}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Capitais" }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Vocabulário básico" }),
  ).toBeVisible();

  const row = page.getByRole("row").filter({ hasText: "Aluno E2E" });
  await expect(row.getByRole("cell", { name: "2 / 2" })).toHaveCount(2);
});
