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

test("aluno: resolve uma atividade de preencher espaços, envia e vê a nota após a liberação (UC-006, RF-017)", async ({
  page,
}) => {
  const teacherEmail = uniqueEmail("prof");
  const studentEmail = uniqueEmail("aluno");

  // professor: cria sala, atividade pronta (modo digitar) e atribui
  await registerTeacher(page, teacherEmail);
  await createClass(page, "Inglês 6º ano");
  const code = await page.getByText(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/).innerText();

  await page.getByRole("link", { name: "ELP" }).click();
  await createActivity(page, "Preencher espaços", "Rotina diária");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  const itemDialog = page.getByRole("dialog");
  await itemDialog.getByLabel("Texto").fill("I usually wake up at 7 o'clock.");
  await itemDialog.getByRole("button", { name: "wake", exact: true }).click();
  await itemDialog.getByLabel("Pontos").fill("3");
  await itemDialog.getByRole("button", { name: "Salvar" }).click();
  await expect(itemDialog).toBeHidden();

  await publishActivity(page);
  await assignActivityToClasses(page, ["Inglês 6º ano"]);

  await page.getByRole("button", { name: "Sair" }).click();

  // aluno: entra na sala pelo código e resolve a atividade
  await joinClassAndOpenAssignment(
    page,
    studentEmail,
    code,
    "Inglês 6º ano",
    "Rotina diária",
  );
  await expectNoA11yViolations(page); // RNF-007 - tela de resolução (aluno)

  await page.getByLabel("Espaço 1 da questão 1").fill("wake");

  await submitAndVerifyReleasedScore(
    page,
    teacherEmail,
    studentEmail,
    "Inglês 6º ano",
    "Rotina diária",
    "Nota: 3 / 3",
  );
});
