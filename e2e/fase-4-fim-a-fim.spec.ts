import { expect, test } from "@playwright/test";
import {
  assignActivityToClasses,
  createActivity,
  createAndAssignChoiceActivity,
  createAndAssignMeaningMatchingActivity,
  createClass,
  joinClassAndOpenAssignment,
  login,
  publishActivity,
  registerTeacher,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

/**
 * Fecha a Fase 4: cobre o critério de saída literal do plano (§11) — o
 * aluno resolve os 4 tipos do MVP numa única sala, o professor libera
 * os resultados (manual e por encerrar, ADR-013) e o aluno revisita
 * cada um e vê a nota certa. De quebra, confere RN-013/ADR-014: a
 * primeira tentativa trava a atividade no repositório do professor.
 */
test("fluxo completo da Fase 4 — aluno resolve os 4 tipos, professor libera resultados, aluno vê as notas", async ({
  page,
}) => {
  // jornada bem mais longa que os specs de um tipo só (4 atividades, 3
  // sessões de login) — o dobro do timeout padrão de 60s dá folga real,
  // não só compensa lentidão de máquina local.
  test.setTimeout(120_000);

  const teacherEmail = uniqueEmail("prof");
  const studentEmail = uniqueEmail("aluno");
  const className = "Turma Completa";

  await registerTeacher(page, teacherEmail);
  await createClass(page, className);
  const code = await page.getByText(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/).innerText();

  // múltipla escolha — liberação manual (padrão)
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

  // preencher espaços (modo digitar) — liberação manual
  await page.getByRole("link", { name: "ELP" }).click();
  await createActivity(page, "Preencher espaços", "Rotina diária");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  const fibDialog = page.getByRole("dialog");
  await fibDialog.getByLabel("Texto").fill("I usually wake up at 7 o'clock.");
  await fibDialog.getByRole("button", { name: "wake", exact: true }).click();
  await fibDialog.getByLabel("Pontos").fill("3");
  await fibDialog.getByRole("button", { name: "Salvar" }).click();
  await expect(fibDialog).toBeHidden();
  await publishActivity(page);
  await assignActivityToClasses(page, [className]);

  // tradução/localização (modo padrão) — liberação manual
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

  // relacionamento de significados — liberação automática ao encerrar (ADR-013)
  await createAndAssignMeaningMatchingActivity(
    page,
    [className],
    "Animais e cores",
    [
      { term: "cat", meaning: "gato" },
      { term: "dog", meaning: "cachorro" },
    ],
    "4",
    { resultsPolicy: "Automaticamente ao encerrar" },
  );

  await page.getByRole("button", { name: "Sair" }).click();

  // aluno: entra na sala e resolve os 4 tipos, um atrás do outro
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
  await page.getByRole("link", { name: "Rotina diária" }).click();
  await page.getByLabel("Espaço 1 da questão 1").fill("wake");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Tentativa enviada.")).toBeVisible();

  await page.getByRole("link", { name: "← Voltar para a sala" }).click();
  await page.getByRole("link", { name: "Vocabulário básico" }).click();
  await page.getByLabel("house (questão 1)").check();
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Tentativa enviada.")).toBeVisible();

  await page.getByRole("link", { name: "← Voltar para a sala" }).click();
  await page.getByRole("link", { name: "Animais e cores" }).click();
  await page
    .getByLabel('Relacionar "cat" (questão 1)')
    .selectOption({ label: "gato" });
  await page
    .getByLabel('Relacionar "dog" (questão 1)')
    .selectOption({ label: "cachorro" });
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Tentativa enviada.")).toBeVisible();
  await expect(
    page.getByText("Aguardando liberação do resultado pelo professor."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();

  // professor: a primeira tentativa trava "Capitais" no repositório (RN-013/ADR-014)
  await login(page, teacherEmail);
  await page.getByRole("link", { name: "Minhas atividades" }).click();
  await page.getByRole("link", { name: "Capitais" }).click();
  await expect(page).toHaveURL(/\/atividades\/[^/]+$/);
  await expect(
    page.getByRole("heading", { name: "Capitais", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Travada", { exact: true })).toBeVisible();

  // libera manualmente os 3 primeiros e encerra o de relacionamento
  // (libera sozinho, por ON_CLOSE)
  await page.getByRole("link", { name: "ELP" }).click();
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: className }).click();

  const assignments = page.getByRole("list", { name: "Atividades atribuídas" });
  for (const title of ["Capitais", "Rotina diária", "Vocabulário básico"]) {
    await assignments
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByRole("button", { name: "Liberar resultados" })
      .click();
  }
  await expect(page.getByText("resultados liberados")).toHaveCount(3);

  page.once("dialog", (d) => d.accept());
  await assignments
    .getByRole("listitem")
    .filter({ hasText: "Animais e cores" })
    .getByRole("button", { name: "Encerrar" })
    .click();
  await expect(page.getByText("resultados liberados")).toHaveCount(4);

  await page.getByRole("button", { name: "Sair" }).click();

  // aluno: revisita cada atividade e vê a nota certa
  await login(page, studentEmail);
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: className }).click();

  await page.getByRole("link", { name: "Capitais" }).click();
  await expect(page.getByText("Nota: 2 / 2")).toBeVisible();
  await page.getByRole("link", { name: "← Voltar para a sala" }).click();

  await page.getByRole("link", { name: "Rotina diária" }).click();
  await expect(page.getByText("Nota: 3 / 3")).toBeVisible();
  await page.getByRole("link", { name: "← Voltar para a sala" }).click();

  await page.getByRole("link", { name: "Vocabulário básico" }).click();
  await expect(page.getByText("Nota: 2 / 2")).toBeVisible();
  await page.getByRole("link", { name: "← Voltar para a sala" }).click();

  await page.getByRole("link", { name: "Animais e cores" }).click();
  await expect(page.getByText("Nota: 4 / 4")).toBeVisible();
});
