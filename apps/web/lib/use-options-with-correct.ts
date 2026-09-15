"use client";

import { useState } from "react";

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

/**
 * Estado + ações da lista de alternativas com "marque a correta" —
 * compartilhado pelos diálogos de item de Multiple Choice e Translation
 * (ver components/ui/options-with-correct-field.tsx para a UI).
 */
export function useOptionsWithCorrect(
  initialOptions: string[],
  initialCorrectIndex: number,
) {
  const [options, setOptions] = useState<string[]>(initialOptions);
  const [correctIndex, setCorrectIndex] = useState(initialCorrectIndex);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    setOptions((prev) => (prev.length < MAX_OPTIONS ? [...prev, ""] : prev));
  }

  function removeOption(index: number) {
    setOptions((prev) => {
      if (prev.length <= MIN_OPTIONS) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setCorrectIndex((prev) => {
      if (prev === index) return 0;
      return prev > index ? prev - 1 : prev;
    });
  }

  return {
    options,
    correctIndex,
    setCorrectIndex,
    updateOption,
    addOption,
    removeOption,
  };
}
