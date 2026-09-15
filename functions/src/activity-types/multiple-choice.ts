import { HttpsError } from "firebase-functions/v2/https";
import type { ActivityTypeHandler } from "./types";
import { validateCorrectIndex, validateOptions } from "./option-validation";

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
    validateOptions(config.options);
    validateCorrectIndex(config.correctIndex, config.options.length);
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
