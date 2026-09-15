import { expect, test } from "@playwright/test";
import {
  addChoiceItem,
  assignActivityToClasses,
  createActivity,
  createClass,
  login,
  publishActivity,
  registerStudent,
  registerTeacher,
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
  await registerStudent(page, studentEmail);
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: "Entrar em sala" }).click();
  await page.getByLabel("Código da sala").fill(code);
  await page.getByRole("button", { name: "Entrar na sala" }).click();

  await page.getByRole("link", { name: "Inglês 6º ano" }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+$/);
  await page.getByRole("link", { name: "Capitais" }).click();
  await expect(page).toHaveURL(/\/salas\/[^/]+\/atividades\/[^/]+$/);

  await page.getByLabel("Paris (questão 1)").check();
  await page.getByRole("button", { name: "Enviar" }).click();

  await expect(page.getByText("Tentativa enviada.")).toBeVisible();
  await expect(
    page.getByText("Aguardando liberação do resultado pelo professor."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();

  // professor: libera os resultados
  await login(page, teacherEmail);
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: "Inglês 6º ano" }).click();
  await page.getByRole("button", { name: "Liberar resultados" }).click();
  await expect(page.getByText("resultados liberados")).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();

  // aluno: volta na atividade e agora vê a nota
  await login(page, studentEmail);
  await page.getByRole("link", { name: "Minhas salas" }).click();
  await page.getByRole("link", { name: "Inglês 6º ano" }).click();
  await page.getByRole("link", { name: "Capitais" }).click();
  await expect(page.getByText("Nota: 2 / 2")).toBeVisible();
});
