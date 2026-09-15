import { describe, expect, it } from "vitest";
import { translationHandler } from "./translation";

const validConfig = {
  mode: "MULTIPLE_CHOICE" as const,
  source: "casa",
  options: ["house", "car", "tree", "book"],
  correctIndex: 0,
};

describe("translationHandler.validate", () => {
  it("aceita uma configuração válida (MULTIPLE_CHOICE)", () => {
    expect(() => translationHandler.validate(validConfig)).not.toThrow();
  });

  it("aceita uma configuração válida (INDEXING)", () => {
    expect(() =>
      translationHandler.validate({ ...validConfig, mode: "INDEXING" }),
    ).not.toThrow();
  });

  it("rejeita modo inválido", () => {
    expect(() =>
      // @ts-expect-error simula valor inválido vindo do client
      translationHandler.validate({ ...validConfig, mode: "DRAG" }),
    ).toThrow(/modo/);
  });

  it("rejeita source vazio", () => {
    expect(() =>
      translationHandler.validate({ ...validConfig, source: "  " }),
    ).toThrow(/traduzid/);
  });

  it("rejeita menos de 2 alternativas", () => {
    expect(() =>
      translationHandler.validate({ ...validConfig, options: ["house"] }),
    ).toThrow(/alternativas/);
  });

  it("rejeita mais de 6 alternativas", () => {
    expect(() =>
      translationHandler.validate({
        ...validConfig,
        options: ["a", "b", "c", "d", "e", "f", "g"],
        correctIndex: 0,
      }),
    ).toThrow(/alternativas/);
  });

  it("rejeita alternativa em branco", () => {
    expect(() =>
      translationHandler.validate({
        ...validConfig,
        options: ["house", "  ", "tree", "book"],
      }),
    ).toThrow(/branco/);
  });

  it("rejeita correctIndex fora do intervalo", () => {
    expect(() =>
      translationHandler.validate({ ...validConfig, correctIndex: 4 }),
    ).toThrow(/correta/);
    expect(() =>
      translationHandler.validate({ ...validConfig, correctIndex: -1 }),
    ).toThrow(/correta/);
  });
});

describe("translationHandler.toStudentContent", () => {
  it("remove o gabarito (correctIndex)", () => {
    const studentView = translationHandler.toStudentContent(validConfig);
    expect(studentView).toEqual({
      mode: validConfig.mode,
      source: validConfig.source,
      options: validConfig.options,
    });
    expect(studentView).not.toHaveProperty("correctIndex");
  });
});

describe("translationHandler.toGradingConfig", () => {
  it("extrai só o correctIndex", () => {
    expect(translationHandler.toGradingConfig(validConfig)).toEqual({
      correctIndex: 0,
    });
  });
});

describe("translationHandler.score", () => {
  const gradingConfig = { correctIndex: 0 };

  it("pontua cheio quando a resposta está correta", () => {
    const result = translationHandler.score(
      { selectedIndex: 0 },
      gradingConfig,
      5,
    );
    expect(result).toEqual({ isCorrect: true, pointsAwarded: 5 });
  });

  it("não pontua quando a resposta está errada", () => {
    const result = translationHandler.score(
      { selectedIndex: 1 },
      gradingConfig,
      5,
    );
    expect(result).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });

  it("não pontua quando não há resposta", () => {
    // @ts-expect-error simula resposta ausente/malformada vinda do client
    const result = translationHandler.score(undefined, gradingConfig, 5);
    expect(result).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });
});
