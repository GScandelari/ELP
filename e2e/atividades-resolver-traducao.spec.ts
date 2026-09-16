import { test } from "@playwright/test";
import {
  joinClassAndOpenAssignment,
  setupChoiceActivityAssignedToClass,
  submitAndVerifyReleasedScore,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

test("aluno: resolve uma atividade de tradução/localização, envia e vê a nota após a liberação (UC-006, RF-017)", async ({
  page,
}) => {
  const teacherEmail = uniqueEmail("prof");
  const studentEmail = uniqueEmail("aluno");

  // modo padrão (marcar a alternativa certa)
  const code = await setupChoiceActivityAssignedToClass(
    page,
    teacherEmail,
    "Inglês 6º ano",
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

  // aluno: entra na sala pelo código e resolve a atividade
  await joinClassAndOpenAssignment(
    page,
    studentEmail,
    code,
    "Inglês 6º ano",
    "Vocabulário básico",
  );

  await page.getByLabel("house (questão 1)").check();

  await submitAndVerifyReleasedScore(
    page,
    teacherEmail,
    studentEmail,
    "Inglês 6º ano",
    "Vocabulário básico",
    "Nota: 2 / 2",
  );
});
