"use client";

import type { AssignmentContentEntry } from "@/lib/assignments";

export type MeaningMatchingAnswer = { matches: Record<string, string> };

type MeaningMatchingContent = {
  leftItems: { id: string; left: string }[];
  rightItems: { id: string; right: string }[];
};

/**
 * Versão interativa do `MeaningMatchingRenderer` (Fase 3) — captura a
 * resposta do aluno em vez de só exibir. Clique/seleção, sem
 * drag-and-drop (decisão §8.3 do plano da Fase 3, mesma UI do
 * `<select>` desabilitado que o renderer já usava, só habilitado
 * aqui). Produz o formato `TAnswer` (`{matches}`) que
 * `submitAttempt`/`score()` do handler espera (Fase 3,
 * `functions/src/activity-types/meaning-matching.ts`).
 */
export function MeaningMatchingAnswerable({
  items,
  answers,
  onAnswerChange,
  disabled,
}: {
  items: AssignmentContentEntry<MeaningMatchingContent>[];
  answers: Record<string, MeaningMatchingAnswer | undefined>;
  onAnswerChange: (itemId: string, answer: MeaningMatchingAnswer) => void;
  disabled: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum item nesta atividade.
      </p>
    );
  }

  function handleMatchChange(itemId: string, leftId: string, rightId: string) {
    const current = answers[itemId]?.matches ?? {};
    onAnswerChange(itemId, { matches: { ...current, [leftId]: rightId } });
  }

  return (
    <ol className="space-y-6">
      {items.map((item, index) => {
        const matches = answers[item.itemId]?.matches ?? {};

        return (
          <li key={item.itemId}>
            <p className="font-medium">{index + 1}. Relacione:</p>
            <ul className="mt-1 space-y-1 text-sm">
              {item.content.leftItems.map((leftItem) => (
                <li key={leftItem.id} className="flex items-center gap-2">
                  <span>{leftItem.left}</span>
                  <span className="text-muted-foreground">→</span>
                  <select
                    aria-label={`Relacionar "${leftItem.left}" (questão ${index + 1})`}
                    disabled={disabled}
                    value={matches[leftItem.id] ?? ""}
                    onChange={(e) =>
                      handleMatchChange(
                        item.itemId,
                        leftItem.id,
                        e.target.value,
                      )
                    }
                    className="rounded border border-border px-1 text-sm"
                  >
                    <option value="">—</option>
                    {item.content.rightItems.map((rightItem) => (
                      <option key={rightItem.id} value={rightItem.id}>
                        {rightItem.right}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
