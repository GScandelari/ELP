import { HttpsError } from "firebase-functions/v2/https";
import type { ActivityTypeHandler } from "./types";

export type MultipleChoiceConfig = {
  question: string;
  options: string[];
  correctIndex: number;
};

export type MultipleChoiceStudentView = {
  question: string;
  options: string[];
};

export type MultipleChoiceGrading = {
  correctIndex: number;
};

export type MultipleChoiceAnswer = {
  selectedIndex: number;
};

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

/** Handler do tipo "Múltipla escolha" (RF-009, seção 9.4 do SDD). */
export const multipleChoiceHandler: ActivityTypeHandler<
  MultipleChoiceConfig,
  MultipleChoiceStudentView,
  MultipleChoiceGrading,
  MultipleChoiceAnswer
> = {
  validate(config) {
    if (
      typeof config.question !== "string" ||
      config.question.trim().length < 2
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Cada questão precisa de um enunciado.",
      );
    }
    if (
      !Array.isArray(config.options) ||
      config.options.length < MIN_OPTIONS ||
      config.options.length > MAX_OPTIONS
    ) {
      throw new HttpsError(
        "invalid-argument",
        `Cada questão precisa de ${MIN_OPTIONS} a ${MAX_OPTIONS} alternativas.`,
      );
    }
    if (
      config.options.some((o) => typeof o !== "string" || o.trim().length === 0)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Nenhuma alternativa pode ficar em branco.",
      );
    }
    if (
      typeof config.correctIndex !== "number" ||
      !Number.isInteger(config.correctIndex) ||
      config.correctIndex < 0 ||
      config.correctIndex >= config.options.length
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Marque qual alternativa é a correta.",
      );
    }
  },

  toStudentContent(config) {
    return { question: config.question, options: config.options };
  },

  toGradingConfig(config) {
    return { correctIndex: config.correctIndex };
  },

  score(answer, gradingConfig, maxPoints) {
    const isCorrect = answer?.selectedIndex === gradingConfig.correctIndex;
    return { isCorrect, pointsAwarded: isCorrect ? maxPoints : 0 };
  },
};
