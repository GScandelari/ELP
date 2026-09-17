import { expect, test } from "@playwright/test";
import {
  createAndAssignChoiceActivity,
  createClass,
  joinClassAndOpenAssignment,
  login,
  registerTeacher,
  submitAndVerifyPending,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

const CLASS_NAME = "Sala de Resultados";

const ACTIVITIES = [
  {
    typeLabel: "Múltipla escolha",
    title: "Números",
    addButtonName: "Adicionar questão",
    fields: [
      { label: "Enunciado", value: "Quantos dias tem uma semana?" },
      { label: "Alternativa 1", value: "5" },
      { label: "Alternativa 2", value: "7" },
    ],
    correctLabel: "Alternativa 2 é a correta",
    points: "3",
    answerLabel: "7 (questão 1)",
    expectedScore: "3 / 3",
  },
  {
    typeLabel: "Tradução/localização",
    title: "Cores",
    addButtonName: "Adicionar item",
    fields: [
      { label: "Palavra ou frase a traduzir", value: "red" },
      { label: "Opção 1", value: "vermelho" },
      { label: "Opção 2", value: "azul" },
    ],
    correctLabel: "Opção 1 é a correta",
    points: "1",
    answerLabel: "vermelho (questão 1)",
    expectedScore: "1 / 1",
  },
];

/**
 * Fecha a Fase 5 (RF-018/UC-007): professor monta e atribui duas
 * atividades, aluno resolve as duas, professor revisita a sala e vê a
 * tabela de resultados certa — sem liberar nada (RN-010: o professor
 * vê a nota real independente de `resultsReleased`). As duas
 * atividades são criadas/resolvidas num loop de dados em vez de dois
 * blocos quase idênticos (a lição de duplicação da PR 4.5).
 */
test("professor: vê a tabela de resultados da sala, sem depender de liberação (RF-018, RN-010)", async ({
  page,
}) => {
  const teacherEmail = uniqueEmail("prof");
  const studentEmail = uniqueEmail("aluno");

  await registerTeacher(page, teacherEmail);
  await createClass(page, CLASS_NAME);
  const code = await page.getByText(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/).innerText();

  for (const activity of ACTIVITIES) {
    await createAndAssignChoiceActivity(
      page,
      [CLASS_NAME],
      activity.typeLabel,
      activity.title,
      activity.addButtonName,
      activity.fields,
      activity.correctLabel,
      activity.points,
    );
  }

  await page.getByRole("button", { name: "Sair" }).click();

  // aluno: entra na sala pelo código e resolve as duas atividades
  await joinClassAndOpenAssignment(
    page,
    studentEmail,
    code,
    CLASS_NAME,
    ACTIVITIES[0]!.title,
  );
  for (const [index, activity] of ACTIVITIES.entries()) {
    if (index > 0) {
      await page.getByRole("link", { name: "← Voltar para a sala" }).click();
      await page.getByRole("link", { name: activity.title }).click();
    }
    await page.getByLabel(activity.answerLabel).check();
    await submitAndVerifyPending(page);
  }

  await page.getByRole("button", { name: "Sair" }).click();

  // professor: revisita a sala e vê a tabela — nenhum resultado foi liberado
  await login(page, teacherEmail);
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: CLASS_NAME }).click();
  await page.getByRole("link", { name: "Ver resultados" }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+\/resultados$/);

  await expect(
    page.getByRole("heading", { name: `Resultados — ${CLASS_NAME}` }),
  ).toBeVisible();

  const row = page.getByRole("row").filter({ hasText: "Aluno E2E" });
  for (const activity of ACTIVITIES) {
    await expect(
      page.getByRole("columnheader", { name: activity.title }),
    ).toBeVisible();
    await expect(
      row.getByRole("cell", { name: activity.expectedScore }),
    ).toBeVisible();
  }
});
