import { HttpsError } from "firebase-functions/v2/https";

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

/**
 * Validação de `options`/`correctIndex` compartilhada pelos tipos que
 * pedem "escolha a alternativa certa" (Multiple Choice, Translation).
 */
export function validateOptions(options: unknown): asserts options is string[] {
  if (
    !Array.isArray(options) ||
    options.length < MIN_OPTIONS ||
    options.length > MAX_OPTIONS
  ) {
    throw new HttpsError(
      "invalid-argument",
      `São necessárias de ${MIN_OPTIONS} a ${MAX_OPTIONS} alternativas.`,
    );
  }
  if (options.some((o) => typeof o !== "string" || o.trim().length === 0)) {
    throw new HttpsError(
      "invalid-argument",
      "Nenhuma alternativa pode ficar em branco.",
    );
  }
}

export function validateCorrectIndex(
  correctIndex: unknown,
  optionsLength: number,
): asserts correctIndex is number {
  if (
    typeof correctIndex !== "number" ||
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex >= optionsLength
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Marque qual alternativa é a correta.",
    );
  }
}
