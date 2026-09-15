import { describe, expect, it } from "vitest";
import { meaningMatchingHandler } from "./meaning-matching";

const validConfig = {
  pairs: [
    { id: "1", left: "cat", right: "gato" },
    { id: "2", left: "dog", right: "cachorro" },
    { id: "3", left: "house", right: "casa" },
  ],
};

describe("meaningMatchingHandler.validate", () => {
  it("aceita uma configuração válida", () => {
    expect(() => meaningMatchingHandler.validate(validConfig)).not.toThrow();
  });

  it("rejeita menos de 2 pares", () => {
    expect(() =>
      meaningMatchingHandler.validate({
        pairs: [{ id: "1", left: "cat", right: "gato" }],
      }),
    ).toThrow(/pares/);
  });

  it("rejeita mais de 8 pares", () => {
    const pairs = Array.from({ length: 9 }, (_, i) => ({
      id: String(i),
      left: `l${i}`,
      right: `r${i}`,
    }));
    expect(() => meaningMatchingHandler.validate({ pairs })).toThrow(/pares/);
  });

  it("rejeita ids duplicados", () => {
    expect(() =>
      meaningMatchingHandler.validate({
        pairs: [
          { id: "1", left: "cat", right: "gato" },
          { id: "1", left: "dog", right: "cachorro" },
        ],
      }),
    ).toThrow(/identificador único/);
  });

  it("rejeita lado esquerdo em branco", () => {
    expect(() =>
      meaningMatchingHandler.validate({
        pairs: [
          { id: "1", left: "  ", right: "gato" },
          { id: "2", left: "dog", right: "cachorro" },
        ],
      }),
    ).toThrow(/branco/);
  });

  it("rejeita lado direito em branco", () => {
    expect(() =>
      meaningMatchingHandler.validate({
        pairs: [
          { id: "1", left: "cat", right: "  " },
          { id: "2", left: "dog", right: "cachorro" },
        ],
      }),
    ).toThrow(/branco/);
  });
});

describe("meaningMatchingHandler.toStudentContent", () => {
  it("mantém todos os pares, sem revelar o gabarito lado a lado", () => {
    const studentView = meaningMatchingHandler.toStudentContent(validConfig);
    expect(studentView.leftItems).toHaveLength(3);
    expect(studentView.rightItems).toHaveLength(3);
    expect(new Set(studentView.leftItems.map((i) => i.id))).toEqual(
      new Set(["1", "2", "3"]),
    );
    expect(new Set(studentView.rightItems.map((i) => i.id))).toEqual(
      new Set(["1", "2", "3"]),
    );
    expect(studentView.leftItems.map((i) => i.left).sort()).toEqual(
      ["cat", "dog", "house"].sort(),
    );
    expect(studentView.rightItems.map((i) => i.right).sort()).toEqual(
      ["cachorro", "casa", "gato"].sort(),
    );
  });
});

describe("meaningMatchingHandler.toGradingConfig", () => {
  it("extrai os pares completos", () => {
    expect(meaningMatchingHandler.toGradingConfig(validConfig)).toEqual({
      pairs: validConfig.pairs,
    });
  });
});

describe("meaningMatchingHandler.score", () => {
  const gradingConfig = { pairs: validConfig.pairs };

  it("pontua cheio quando todos os pares estão certos", () => {
    const result = meaningMatchingHandler.score(
      { matches: { "1": "1", "2": "2", "3": "3" } },
      gradingConfig,
      6,
    );
    expect(result).toEqual({ isCorrect: true, pointsAwarded: 6 });
  });

  it("não pontua quando um par está errado", () => {
    const result = meaningMatchingHandler.score(
      { matches: { "1": "2", "2": "1", "3": "3" } },
      gradingConfig,
      6,
    );
    expect(result).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });

  it("não pontua quando faltam associações", () => {
    const result = meaningMatchingHandler.score(
      { matches: { "1": "1" } },
      gradingConfig,
      6,
    );
    expect(result).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });

  it("não pontua quando não há resposta", () => {
    // @ts-expect-error simula resposta ausente/malformada vinda do client
    const result = meaningMatchingHandler.score(undefined, gradingConfig, 6);
    expect(result).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });
});
