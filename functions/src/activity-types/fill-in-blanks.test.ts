import { describe, expect, it } from "vitest";
import { fillInBlanksHandler } from "./fill-in-blanks";

const typingConfig = {
  mode: "TYPING" as const,
  text: "I usually {{1}} up at 7 o'clock.",
  blanks: [{ id: "1", answer: "wake" }],
};

const wordBankConfig = {
  mode: "WORD_BANK" as const,
  text: "I usually {{1}} up at 7 o'clock.",
  blanks: [{ id: "1", answer: "wake" }],
  wordBank: ["wake", "sleep", "run"],
};

describe("fillInBlanksHandler.validate", () => {
  it("aceita uma configuração TYPING válida", () => {
    expect(() => fillInBlanksHandler.validate(typingConfig)).not.toThrow();
  });

  it("aceita uma configuração WORD_BANK válida", () => {
    expect(() => fillInBlanksHandler.validate(wordBankConfig)).not.toThrow();
  });

  it("rejeita modo inválido", () => {
    expect(() =>
      // @ts-expect-error simula payload malformado vindo do client
      fillInBlanksHandler.validate({ ...typingConfig, mode: "DRAG" }),
    ).toThrow(/modo/i);
  });

  it("rejeita texto vazio", () => {
    expect(() =>
      fillInBlanksHandler.validate({ ...typingConfig, text: " " }),
    ).toThrow(/texto/);
  });

  it("rejeita sem nenhum espaço marcado", () => {
    expect(() =>
      fillInBlanksHandler.validate({ ...typingConfig, blanks: [] }),
    ).toThrow(/pelo menos uma palavra/);
  });

  it("rejeita ids de espaço duplicados", () => {
    expect(() =>
      fillInBlanksHandler.validate({
        ...typingConfig,
        text: "{{1}} {{1}}",
        blanks: [
          { id: "1", answer: "a" },
          { id: "1", answer: "b" },
        ],
      }),
    ).toThrow(/único/);
  });

  it("rejeita resposta em branco", () => {
    expect(() =>
      fillInBlanksHandler.validate({
        ...typingConfig,
        blanks: [{ id: "1", answer: "  " }],
      }),
    ).toThrow(/resposta/);
  });

  it("rejeita quando o texto não marca todos os espaços cadastrados", () => {
    expect(() =>
      fillInBlanksHandler.validate({
        ...typingConfig,
        text: "Sem marcador nenhum aqui.",
      }),
    ).toThrow(/corresponder/);
  });

  it("rejeita quando o texto marca um espaço não cadastrado", () => {
    expect(() =>
      fillInBlanksHandler.validate({
        ...typingConfig,
        text: "I usually {{1}} up, then {{2}} breakfast.",
      }),
    ).toThrow(/corresponder/);
  });

  it("WORD_BANK rejeita sem banco de palavras", () => {
    expect(() =>
      fillInBlanksHandler.validate({ ...typingConfig, mode: "WORD_BANK" }),
    ).toThrow(/banco de palavras/);
  });

  it("WORD_BANK rejeita banco sem a resposta correta", () => {
    expect(() =>
      fillInBlanksHandler.validate({
        ...wordBankConfig,
        wordBank: ["sleep", "run"],
      }),
    ).toThrow(/banco de palavras/);
  });
});

describe("fillInBlanksHandler.toStudentContent", () => {
  it("modo TYPING não vaza a resposta em lugar nenhum", () => {
    const view = fillInBlanksHandler.toStudentContent(typingConfig);
    expect(view).toEqual({
      mode: "TYPING",
      text: typingConfig.text,
      blankIds: ["1"],
      wordBank: undefined,
    });
    expect(JSON.stringify(view)).not.toContain("wake");
  });

  it("modo WORD_BANK inclui o banco (a resposta certa está lá, mas o aluno precisa escolher)", () => {
    const view = fillInBlanksHandler.toStudentContent(wordBankConfig);
    expect(view).toEqual({
      mode: "WORD_BANK",
      text: wordBankConfig.text,
      blankIds: ["1"],
      wordBank: wordBankConfig.wordBank,
    });
    // o formato "blanks: [{id, answer}]" do gabarito não aparece — só a
    // lista solta de palavras, sem dizer qual espaço cada uma preenche
    expect(view).not.toHaveProperty("blanks");
  });
});

describe("fillInBlanksHandler.toGradingConfig", () => {
  it("mantém as respostas dos espaços", () => {
    expect(fillInBlanksHandler.toGradingConfig(typingConfig)).toEqual({
      blanks: typingConfig.blanks,
    });
  });
});

describe("fillInBlanksHandler.score", () => {
  const gradingConfig = {
    blanks: [
      { id: "1", answer: "wake", acceptedAnswers: ["woke"] },
      { id: "2", answer: "eat" },
    ],
  };

  it("pontua cheio quando todas as respostas batem (case/espaço insensível)", () => {
    const result = fillInBlanksHandler.score(
      { values: { "1": " Wake ", "2": "EAT" } },
      gradingConfig,
      4,
    );
    expect(result).toEqual({ isCorrect: true, pointsAwarded: 4 });
  });

  it("aceita uma resposta alternativa (acceptedAnswers)", () => {
    const result = fillInBlanksHandler.score(
      { values: { "1": "woke", "2": "eat" } },
      gradingConfig,
      4,
    );
    expect(result.isCorrect).toBe(true);
  });

  it("não pontua se faltar um espaço (acerta tudo ou nada)", () => {
    const result = fillInBlanksHandler.score(
      { values: { "1": "wake" } },
      gradingConfig,
      4,
    );
    expect(result).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });

  it("não pontua com resposta errada", () => {
    const result = fillInBlanksHandler.score(
      { values: { "1": "sleep", "2": "eat" } },
      gradingConfig,
      4,
    );
    expect(result).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });
});
