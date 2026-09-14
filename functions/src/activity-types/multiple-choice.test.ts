import { describe, expect, it } from "vitest";
import { multipleChoiceHandler } from "./multiple-choice";

const validConfig = {
  question: "Where does John live?",
  options: ["London", "Paris", "Dublin", "Madrid"],
  correctIndex: 2,
};

describe("multipleChoiceHandler.validate", () => {
  it("aceita uma configuração válida", () => {
    expect(() => multipleChoiceHandler.validate(validConfig)).not.toThrow();
  });

  it("rejeita enunciado vazio", () => {
    expect(() =>
      multipleChoiceHandler.validate({ ...validConfig, question: " " }),
    ).toThrow(/enunciado/);
  });

  it("rejeita menos de 2 alternativas", () => {
    expect(() =>
      multipleChoiceHandler.validate({ ...validConfig, options: ["Só uma"] }),
    ).toThrow(/alternativas/);
  });

  it("rejeita mais de 6 alternativas", () => {
    expect(() =>
      multipleChoiceHandler.validate({
        ...validConfig,
        options: ["a", "b", "c", "d", "e", "f", "g"],
        correctIndex: 0,
      }),
    ).toThrow(/alternativas/);
  });

  it("rejeita alternativa em branco", () => {
    expect(() =>
      multipleChoiceHandler.validate({
        ...validConfig,
        options: ["London", "  ", "Dublin", "Madrid"],
      }),
    ).toThrow(/branco/);
  });

  it("rejeita correctIndex fora do intervalo", () => {
    expect(() =>
      multipleChoiceHandler.validate({ ...validConfig, correctIndex: 4 }),
    ).toThrow(/correta/);
    expect(() =>
      multipleChoiceHandler.validate({ ...validConfig, correctIndex: -1 }),
    ).toThrow(/correta/);
  });
});

describe("multipleChoiceHandler.toStudentContent", () => {
  it("remove o gabarito (correctIndex)", () => {
    const studentView = multipleChoiceHandler.toStudentContent(validConfig);
    expect(studentView).toEqual({
      question: validConfig.question,
      options: validConfig.options,
    });
    expect(studentView).not.toHaveProperty("correctIndex");
  });
});

describe("multipleChoiceHandler.toGradingConfig", () => {
  it("extrai só o correctIndex", () => {
    expect(multipleChoiceHandler.toGradingConfig(validConfig)).toEqual({
      correctIndex: 2,
    });
  });
});

describe("multipleChoiceHandler.score", () => {
  const gradingConfig = { correctIndex: 2 };

  it("pontua cheio quando a resposta está correta", () => {
    const result = multipleChoiceHandler.score(
      { selectedIndex: 2 },
      gradingConfig,
      5,
    );
    expect(result).toEqual({ isCorrect: true, pointsAwarded: 5 });
  });

  it("não pontua quando a resposta está errada", () => {
    const result = multipleChoiceHandler.score(
      { selectedIndex: 0 },
      gradingConfig,
      5,
    );
    expect(result).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });

  it("não pontua quando não há resposta", () => {
    // @ts-expect-error simula resposta ausente/malformada vinda do client
    const result = multipleChoiceHandler.score(undefined, gradingConfig, 5);
    expect(result).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });
});
