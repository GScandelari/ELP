"use client";

import type { AssignmentContentEntry } from "@/lib/assignments";

export type MultipleChoiceAnswer = { selectedIndex: number };

/**
 * Versão interativa do `MultipleChoiceRenderer` (Fase 3) — captura a
 * resposta do aluno em vez de só exibir. Não sabe nada de correção; só
 * produz o formato `TAnswer` que `submitAttempt`/`score()` do handler
 * espera (Fase 3, `functions/src/activity-types/multiple-choice.ts`).
 */
export function MultipleChoiceAnswerable({
  items,
  answers,
  onAnswerChange,
  disabled,
}: {
  items: AssignmentContentEntry<{ question: string; options: string[] }>[];
  answers: Record<string, MultipleChoiceAnswer | undefined>;
  onAnswerChange: (itemId: string, answer: MultipleChoiceAnswer) => void;
  disabled: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum item nesta atividade.
      </p>
    );
  }

  return (
    <ol className="space-y-6">
      {items.map((item, index) => (
        <li key={item.itemId}>
          <p className="font-medium">
            {index + 1}. {item.content.question}
          </p>
          <ul className="mt-1 space-y-1 text-sm">
            {item.content.options.map((option, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`item-${item.itemId}`}
                  checked={answers[item.itemId]?.selectedIndex === i}
                  disabled={disabled}
                  onChange={() =>
                    onAnswerChange(item.itemId, { selectedIndex: i })
                  }
                  aria-label={`${option} (questão ${index + 1})`}
                />
                <span>{option}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
