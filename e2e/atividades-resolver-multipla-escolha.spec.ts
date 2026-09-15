import { expect, test } from "@playwright/test";
import {
  addChoiceItem,
  assignActivityToClasses,
  createActivity,
  createClass,
  joinClassAndOpenAssignment,
  publishActivity,
  registerTeacher,
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

  // professor: cria sala, atividade pronta e atribui
  await registerTeacher(page, teacherEmail);
  await createClass(page, "Inglês 6º ano");
  const code = await page.getByText(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/).innerText();

  await page.getByRole("link", { name: "ELP" }).click();
  await createActivity(page, "Múltipla escolha", "Capitais");
  await addChoiceItem(
    page,
    "Adicionar questão",
    [
      { label: "Enunciado", value: "Qual é a capital da França?" },
      { label: "Alternativa 1", value: "Londres" },
      { label: "Alternativa 2", value: "Paris" },
    ],
    "Alternativa 2 é a correta",
    "2",
  );
  await publishActivity(page);
  await assignActivityToClasses(page, ["Inglês 6º ano"]);

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
