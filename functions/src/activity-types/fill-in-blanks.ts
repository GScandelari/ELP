import { HttpsError } from "firebase-functions/v2/https";
import type { ActivityTypeHandler } from "./types";

export type FillInBlanksMode = "TYPING" | "WORD_BANK";

export type FillInBlanksBlank = {
  id: string;
  answer: string;
  acceptedAnswers?: string[];
};

/** `text` marca cada espaço com `{{id}}`, ex.: "I usually {{1}} up at 7." */
export type FillInBlanksConfig = {
  mode: FillInBlanksMode;
  text: string;
  blanks: FillInBlanksBlank[];
  /** Obrigatório quando `mode === 'WORD_BANK'` — precisa conter todas as respostas certas. */
  wordBank?: string[];
};

export type FillInBlanksStudentView = {
  mode: FillInBlanksMode;
  text: string;
  blankIds: string[];
  wordBank?: string[];
};

export type FillInBlanksGrading = {
  blanks: FillInBlanksBlank[];
};

export type FillInBlanksAnswer = {
  /** blankId -> resposta digitada/selecionada pelo aluno */
  values: Record<string, string>;
};

const BLANK_TOKEN_RE = /\{\{([^}]+)\}\}/g;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Handler do tipo "Preencher espaços" (RF-009, seção 9.1 do SDD). */
export const fillInBlanksHandler: ActivityTypeHandler<
  FillInBlanksConfig,
  FillInBlanksStudentView,
  FillInBlanksGrading,
  FillInBlanksAnswer
> = {
  validate(config) {
    if (config.mode !== "TYPING" && config.mode !== "WORD_BANK") {
      throw new HttpsError(
        "invalid-argument",
        "Escolha um modo válido para preencher espaços.",
      );
    }
    if (typeof config.text !== "string" || config.text.trim().length < 2) {
      throw new HttpsError("invalid-argument", "O texto não pode ficar vazio.");
    }
    if (!Array.isArray(config.blanks) || config.blanks.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Marque pelo menos uma palavra para remover do texto.",
      );
    }

    const ids = new Set<string>();
    for (const blank of config.blanks) {
      if (!blank.id || ids.has(blank.id)) {
        throw new HttpsError(
          "invalid-argument",
          "Cada espaço precisa de um identificador único.",
        );
      }
      ids.add(blank.id);
      if (
        typeof blank.answer !== "string" ||
        blank.answer.trim().length === 0
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Cada espaço precisa de uma resposta.",
        );
      }
    }

    const tokens = [...config.text.matchAll(BLANK_TOKEN_RE)].map((m) => m[1]);
    const tokenSet = new Set(tokens);
    const sameCount = tokens.length === config.blanks.length;
    const allBlanksMarked = [...ids].every((id) => tokenSet.has(id));
    if (!sameCount || !allBlanksMarked) {
      throw new HttpsError(
        "invalid-argument",
        "Cada espaço marcado no texto precisa corresponder a exatamente uma resposta cadastrada.",
      );
    }

    if (config.mode === "WORD_BANK") {
      if (!Array.isArray(config.wordBank) || config.wordBank.length === 0) {
        throw new HttpsError(
          "invalid-argument",
          "O banco de palavras precisa ter pelo menos as respostas corretas.",
        );
      }
      const bank = new Set(config.wordBank.map(normalize));
      const missingFromBank = config.blanks.some(
        (b) => !bank.has(normalize(b.answer)),
      );
      if (missingFromBank) {
        throw new HttpsError(
          "invalid-argument",
          "O banco de palavras precisa conter todas as respostas corretas.",
        );
      }
    }
  },

  toStudentContent(config) {
    // O SDK do Firestore rejeita `undefined` como valor de CAMPO na escrita
    // (achado depurando o Builder, ver PR 3.4; reconfirmado na freeze-content
    // de publishAssignment, PR 4.4 — TYPING não tem wordBank). Por isso a
    // chave só entra no objeto quando `config.wordBank` está definido, em
    // vez de `wordBank: config.wordBank`.
    return {
      mode: config.mode,
      text: config.text,
      blankIds: config.blanks.map((b) => b.id),
      ...(config.wordBank ? { wordBank: config.wordBank } : {}),
    };
  },

  toGradingConfig(config) {
    return { blanks: config.blanks };
  },

  score(answer, gradingConfig, maxPoints) {
    // acerta ou erra o item inteiro — sem pontuação parcial por espaço
    // nesta fase (docs/plano-fase-3.md §4.2)
    const isCorrect = gradingConfig.blanks.every((blank) => {
      const submitted = answer?.values?.[blank.id];
      if (typeof submitted !== "string") return false;
      const accepted = [blank.answer, ...(blank.acceptedAnswers ?? [])].map(
        normalize,
      );
      return accepted.includes(normalize(submitted));
    });
    return { isCorrect, pointsAwarded: isCorrect ? maxPoints : 0 };
  },
};
