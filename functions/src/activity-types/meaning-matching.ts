import { randomInt } from "node:crypto";
import { HttpsError } from "firebase-functions/v2/https";
import type { ActivityTypeHandler } from "./types";

const MIN_PAIRS = 2;
const MAX_PAIRS = 8;

export type MeaningMatchingPair = {
  id: string;
  left: string;
  right: string;
};

export type MeaningMatchingConfig = {
  pairs: MeaningMatchingPair[];
};

export type MeaningMatchingStudentView = {
  /** Embaralhados de forma independente — a ordem não denuncia o par certo. */
  leftItems: { id: string; left: string }[];
  rightItems: { id: string; right: string }[];
};

export type MeaningMatchingGrading = {
  pairs: MeaningMatchingPair[];
};

export type MeaningMatchingAnswer = {
  /** leftId (== id do par) -> rightId que o aluno associou a ele */
  matches: Record<string, string>;
};

function shuffled<T>(items: T[]): T[] {
  // embaralho de exibição, não é segredo criptográfico — mas o
  // Math.random() dispara o alerta de PRNG inseguro do SonarCloud
  // (S2245), então uso randomInt (node:crypto) pra já nascer limpo.
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** Handler do tipo "Relacionamento de significados" (RF-009, seção 9.2 do SDD). */
export const meaningMatchingHandler: ActivityTypeHandler<
  MeaningMatchingConfig,
  MeaningMatchingStudentView,
  MeaningMatchingGrading,
  MeaningMatchingAnswer
> = {
  validate(config) {
    if (
      !Array.isArray(config.pairs) ||
      config.pairs.length < MIN_PAIRS ||
      config.pairs.length > MAX_PAIRS
    ) {
      throw new HttpsError(
        "invalid-argument",
        `São necessários de ${MIN_PAIRS} a ${MAX_PAIRS} pares.`,
      );
    }

    const ids = new Set<string>();
    for (const pair of config.pairs) {
      if (!pair.id || ids.has(pair.id)) {
        throw new HttpsError(
          "invalid-argument",
          "Cada par precisa de um identificador único.",
        );
      }
      ids.add(pair.id);
      if (
        typeof pair.left !== "string" ||
        pair.left.trim().length === 0 ||
        typeof pair.right !== "string" ||
        pair.right.trim().length === 0
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Nenhum dos dois lados de um par pode ficar em branco.",
        );
      }
    }
  },

  toStudentContent(config) {
    return {
      leftItems: shuffled(
        config.pairs.map((p) => ({ id: p.id, left: p.left })),
      ),
      rightItems: shuffled(
        config.pairs.map((p) => ({ id: p.id, right: p.right })),
      ),
    };
  },

  toGradingConfig(config) {
    return { pairs: config.pairs };
  },

  score(answer, gradingConfig, maxPoints) {
    // acerta ou erra o item inteiro — sem pontuação parcial por par,
    // mesma decisão de escopo do Fill in the Blanks (docs/plano-fase-3.md §4.2)
    const isCorrect = gradingConfig.pairs.every(
      (pair) => answer?.matches?.[pair.id] === pair.id,
    );
    return { isCorrect, pointsAwarded: isCorrect ? maxPoints : 0 };
  },
};
