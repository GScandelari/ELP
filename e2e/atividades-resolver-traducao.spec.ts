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

test("aluno: resolve uma atividade de tradução/localização, envia e vê a nota após a liberação (UC-006, RF-017)", async ({
  page,
}) => {
  const teacherEmail = uniqueEmail("prof");
  const studentEmail = uniqueEmail("aluno");

  // professor: cria sala, atividade pronta (modo padrão: marcar a
  // alternativa certa) e atribui
  await registerTeacher(page, teacherEmail);
  await createClass(page, "Inglês 6º ano");
  const code = await page.getByText(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/).innerText();

  await page.getByRole("link", { name: "ELP" }).click();
  await createActivity(page, "Tradução/localização", "Vocabulário básico");
  await addChoiceItem(
    page,
    "Adicionar item",
    [
      { label: "Palavra ou frase a traduzir", value: "casa" },
      { label: "Opção 1", value: "house" },
      { label: "Opção 2", value: "car" },
    ],
    "Opção 1 é a correta",
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
