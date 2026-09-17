import { expect, test } from "@playwright/test";
import {
  assignActivityToClasses,
  createActivity,
  createClass,
  expectNoA11yViolations,
  joinClassAndOpenAssignment,
  publishActivity,
  registerTeacher,
  submitAndVerifyReleasedScore,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

test("aluno: resolve uma atividade de relacionamento de significados, envia e vê a nota após a liberação (UC-006, RF-017)", async ({
  page,
}) => {
  const teacherEmail = uniqueEmail("prof");
  const studentEmail = uniqueEmail("aluno");

  // professor: cria sala, atividade pronta (2 pares) e atribui
  await registerTeacher(page, teacherEmail);
  await createClass(page, "Turma de vocabulário");
  const code = await page.getByText(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/).innerText();

  await page.getByRole("link", { name: "ELP" }).click();
  await createActivity(
    page,
    "Relacionamento de significados",
    "Animais e cores",
  );
  await page.getByRole("button", { name: "Adicionar item" }).click();
  const itemDialog = page.getByRole("dialog");
  await itemDialog.getByLabel("Termo 1").fill("cat");
  await itemDialog.getByLabel("Significado 1").fill("gato");
  await itemDialog.getByLabel("Termo 2").fill("dog");
  await itemDialog.getByLabel("Significado 2").fill("cachorro");
  await itemDialog.getByLabel("Pontos").fill("4");
  await itemDialog.getByRole("button", { name: "Salvar" }).click();
  await expect(itemDialog).toBeHidden();

  await publishActivity(page);
  await assignActivityToClasses(page, ["Turma de vocabulário"]);

  await page.getByRole("button", { name: "Sair" }).click();

  // aluno: entra na sala pelo código e resolve a atividade
  await joinClassAndOpenAssignment(
    page,
    studentEmail,
    code,
    "Turma de vocabulário",
    "Animais e cores",
  );
  await expectNoA11yViolations(page); // RNF-007 - tela de resolução (aluno)

  await page
    .getByLabel('Relacionar "cat" (questão 1)')
    .selectOption({ label: "gato" });
  await page
    .getByLabel('Relacionar "dog" (questão 1)')
    .selectOption({ label: "cachorro" });

  await submitAndVerifyReleasedScore(
    page,
    teacherEmail,
    studentEmail,
    "Turma de vocabulário",
    "Animais e cores",
    "Nota: 4 / 4",
  );
});
