import { test } from "@playwright/test";
import {
  resolveChoiceActivityAndVerifyScore,
  uniqueEmail,
  waitForFunctionsEmulator,
  type ChoiceActivityFlowParams,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

const SCENARIOS: (Omit<
  ChoiceActivityFlowParams,
  "teacherEmail" | "studentEmail"
> & { name: string })[] = [
  {
    name: "múltipla escolha",
    className: "Inglês 6º ano",
    typeLabel: "Múltipla escolha",
    activityTitle: "Capitais",
    addButtonName: "Adicionar questão",
    fields: [
      { label: "Enunciado", value: "Qual é a capital da França?" },
      { label: "Alternativa 1", value: "Londres" },
      { label: "Alternativa 2", value: "Paris" },
    ],
    correctLabel: "Alternativa 2 é a correta",
    points: "2",
    answerLabel: "Paris (questão 1)",
    expectedScoreText: "Nota: 2 / 2",
  },
  {
    name: "tradução/localização (modo padrão)",
    className: "Turma de vocabulário",
    typeLabel: "Tradução/localização",
    activityTitle: "Vocabulário básico",
    addButtonName: "Adicionar item",
    fields: [
      { label: "Palavra ou frase a traduzir", value: "casa" },
      { label: "Opção 1", value: "house" },
      { label: "Opção 2", value: "car" },
    ],
    correctLabel: "Opção 1 é a correta",
    points: "2",
    answerLabel: "house (questão 1)",
    expectedScoreText: "Nota: 2 / 2",
  },
];

/**
 * Múltipla Escolha (PR 4.3) e Tradução/localização no modo padrão
 * (PR 4.5) montam o item do mesmo jeito (`addChoiceItem`, uma
 * alternativa certa) e o aluno resolve do mesmo jeito (marcar a
 * alternativa certa) — um único spec data-driven em vez de dois specs
 * quase idênticos (a duplicação barrou o quality gate do SonarCloud;
 * ver e2e/helpers.ts `resolveChoiceActivityAndVerifyScore`). Preencher
 * espaços (PR 4.4) tem um spec próprio porque o fluxo de resposta é
 * genuinamente diferente (digitar, não marcar).
 */
for (const scenario of SCENARIOS) {
  test(`aluno: resolve uma atividade de ${scenario.name}, envia e vê a nota após a liberação (UC-006, RF-017)`, async ({
    page,
  }) => {
    await resolveChoiceActivityAndVerifyScore(page, {
      ...scenario,
      teacherEmail: uniqueEmail("prof"),
      studentEmail: uniqueEmail("aluno"),
    });
  });
}
