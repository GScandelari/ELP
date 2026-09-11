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
  await addDialog.getByLabel("Nome completo do aluno").fill("Aluno E2E");
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

test("professor: inscreve aluno menor sem conta, com consentimento do responsável (RF-021)", async ({
  page,
}) => {
  const teacherEmail = uniqueEmail("prof");
  const minorEmail = uniqueEmail("menor");

  await registerTeacher(page, teacherEmail);
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("button", { name: "Criar sala" }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.getByLabel("Nome").fill("Turma do Menor");
  await createDialog.getByRole("button", { name: "Criar sala" }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+$/);

  await page.getByRole("button", { name: "Adicionar aluno" }).click();
  const addDialog = page.getByRole("dialog");
  await addDialog.getByLabel("E-mail do aluno").fill(minorEmail);
  await addDialog.getByLabel("Nome completo do aluno").fill("Aluno Menor E2E");

  // sem marcar "menor" nem preencher o consentimento, o botão fica desabilitado
  await addDialog.getByLabel("Aluno menor de 18 anos").check();
  await expect(
    addDialog.getByRole("button", { name: "Adicionar" }),
  ).toBeDisabled();

  await addDialog
    .getByLabel("Nome do responsável legal")
    .fill("Responsável E2E");
  await addDialog.getByLabel(/Declaro que obtive o consentimento/).check();
  await expect(
    addDialog.getByRole("button", { name: "Adicionar" }),
  ).toBeEnabled();
  await addDialog.getByRole("button", { name: "Adicionar" }).click();

  // conta criada -> tela do link de definição de senha (entrega manual no MVP)
  await expect(page.getByText("Conta criada.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copiar link" })).toBeVisible();
  await addDialog.getByRole("button", { name: "Concluir" }).click();

  await expect(page.getByText("Aluno Menor E2E")).toBeVisible();
  await expect(page.getByText("Alunos inscritos (1)")).toBeVisible();
});
