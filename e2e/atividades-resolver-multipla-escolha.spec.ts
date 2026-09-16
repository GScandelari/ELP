import { test } from "@playwright/test";
import {
  joinClassAndOpenAssignment,
  setupChoiceActivityAssignedToClass,
  submitAndVerifyReleasedScore,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

test("aluno: resolve uma atividade de múltipla escolha, envia e vê a nota após a liberação (UC-006, RF-017)", async ({
  page,
}) => {
  const teacherEmail = uniqueEmail("prof");
  const studentEmail = uniqueEmail("aluno");

  const code = await setupChoiceActivityAssignedToClass(
    page,
    teacherEmail,
    "Inglês 6º ano",
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
  await page.getByRole("button", { name: "Sair" }).click();

  // aluno: entra na sala pelo código e resolve a atividade
  await joinClassAndOpenAssignment(
    page,
    studentEmail,
    code,
    "Inglês 6º ano",
    "Capitais",
  );

  await page.getByLabel("Paris (questão 1)").check();

  await submitAndVerifyReleasedScore(
    page,
    teacherEmail,
    studentEmail,
    "Inglês 6º ano",
    "Capitais",
    "Nota: 2 / 2",
  );
});
