import { HttpsError } from "firebase-functions/v2/https";
import type { ActivityTypeHandler } from "./types";
import { validateCorrectIndex, validateOptions } from "./option-validation";

/**
 * `MULTIPLE_CHOICE` = aluno marca a alternativa certa (rádio);
 * `INDEXING` = aluno digita o número da alternativa certa — alternativa
 * sem arrastar, acessível por teclado (ADR-007), pro mesmo `configuration`
 * (DRAG_AND_DROP citado no SDD 9.3 fica pra depois, se quiser).
 */
export type TranslationMode = "MULTIPLE_CHOICE" | "INDEXING";

export type TranslationConfig = {
  mode: TranslationMode;
  source: string;
  options: string[];
  correctIndex: number;
};

export type TranslationStudentView = {
  mode: TranslationMode;
  source: string;
  options: string[];
};

export type TranslationGrading = {
  correctIndex: number;
};

export type TranslationAnswer = {
  selectedIndex: number;
};

/** Handler do tipo "Tradução/localização" (RF-009, seção 9.3 do SDD). */
export const translationHandler: ActivityTypeHandler<
  TranslationConfig,
  TranslationStudentView,
  TranslationGrading,
  TranslationAnswer
> = {
  validate(config) {
    if (config.mode !== "MULTIPLE_CHOICE" && config.mode !== "INDEXING") {
      throw new HttpsError(
        "invalid-argument",
        "Escolha um modo válido para a tradução.",
      );
    }
    if (typeof config.source !== "string" || config.source.trim().length < 1) {
      throw new HttpsError(
        "invalid-argument",
        "Informe a palavra ou frase a ser traduzida.",
      );
    }
    validateOptions(config.options);
    validateCorrectIndex(config.correctIndex, config.options.length);
  },

  toStudentContent(config) {
    return {
      mode: config.mode,
      source: config.source,
      options: config.options,
    };
  },

  toGradingConfig(config) {
    return { correctIndex: config.correctIndex };
  },

  score(answer, gradingConfig, maxPoints) {
    const isCorrect = answer?.selectedIndex === gradingConfig.correctIndex;
    return { isCorrect, pointsAwarded: isCorrect ? maxPoints : 0 };
  },
};
