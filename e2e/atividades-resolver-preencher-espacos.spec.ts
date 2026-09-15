import { expect, test } from "@playwright/test";
import {
  assignActivityToClasses,
  createActivity,
  createClass,
  joinClassAndOpenAssignment,
  login,
  publishActivity,
  releaseResultsAsTeacher,
  registerTeacher,
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

  await page.getByLabel("Espaço 1 da questão 1").fill("wake");
  await page.getByRole("button", { name: "Enviar" }).click();

  await expect(page.getByText("Tentativa enviada.")).toBeVisible();
  await expect(
    page.getByText("Aguardando liberação do resultado pelo professor."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();

  // professor: libera os resultados
  await releaseResultsAsTeacher(page, teacherEmail, "Inglês 6º ano");

  // aluno: volta na atividade e agora vê a nota
  await login(page, studentEmail);
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: "Inglês 6º ano" }).click();
  await page.getByRole("link", { name: "Rotina diária" }).click();
  await expect(page.getByText("Nota: 3 / 3")).toBeVisible();
});
