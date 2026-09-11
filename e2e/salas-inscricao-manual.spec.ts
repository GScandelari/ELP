import { expect, test } from "@playwright/test";
import {
  login,
  registerStudent,
  registerTeacher,
  uniqueEmail,
  waitForFunctionsEmulator,
} from "./helpers";

test.beforeAll(waitForFunctionsEmulator);

test("professor: adiciona e remove aluno manualmente (aluno já com conta)", async ({
  page,
}) => {
  const teacherEmail = uniqueEmail("prof");
  const studentEmail = uniqueEmail("aluno");

  // professor cria a sala
  await registerTeacher(page, teacherEmail);
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("button", { name: "Criar sala" }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.getByLabel("Nome").fill("Turma Manual");
  await createDialog.getByRole("button", { name: "Criar sala" }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+$/);
  const classUrl = page.url();

  // aluno cria a própria conta (mas ainda não entrou em nenhuma sala)
  await page.getByRole("button", { name: "Sair" }).click();
  await registerStudent(page, studentEmail);
  await expect(page).toHaveURL(/\/painel$/);

  // professor volta, abre a sala e adiciona o aluno pelo e-mail
  await page.getByRole("button", { name: "Sair" }).click();
  await login(page, teacherEmail);
  await page.goto(classUrl);

  await expect(page.getByText("Nenhum aluno inscrito ainda.")).toBeVisible();

  await page.getByRole("button", { name: "Adicionar aluno" }).click();
  const addDialog = page.getByRole("dialog");
  await addDialog.getByLabel("E-mail do aluno").fill(studentEmail);
  await addDialog.getByRole("button", { name: "Adicionar" }).click();

  await expect(page.getByText(studentEmail)).toBeVisible();
  await expect(page.getByText("Adicionado pelo professor")).toBeVisible();
  await expect(page.getByText("Alunos inscritos (1)")).toBeVisible();

  // a sala passa a aparecer no portal do aluno
  await page.getByRole("button", { name: "Sair" }).click();
  await login(page, studentEmail);
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await expect(
    page.getByRole("heading", { name: "Turma Manual" }),
  ).toBeVisible();

  // professor remove o aluno (RF-005)
  await page.getByRole("button", { name: "Sair" }).click();
  await login(page, teacherEmail);
  await page.goto(classUrl);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remover" }).click();

  await expect(page.getByText("Nenhum aluno inscrito ainda.")).toBeVisible();
  await expect(page.getByText("Alunos inscritos (0)")).toBeVisible();
});
