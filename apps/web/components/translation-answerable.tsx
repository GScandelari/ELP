"use client";

import type { AssignmentContentEntry } from "@/lib/assignments";

export type TranslationAnswer = { selectedIndex: number };

type TranslationContent = {
  mode: "MULTIPLE_CHOICE" | "INDEXING";
  source: string;
  options: string[];
};

/**
 * Versão interativa do `TranslationRenderer` (Fase 3) — captura a
 * resposta do aluno em vez de só exibir. `mode` só muda a UI (rádio vs
 * digitar o número da opção certa); os dois produzem o mesmo formato
 * `TAnswer` (`{selectedIndex}`) que `submitAttempt`/`score()` do
 * handler espera (Fase 3, `functions/src/activity-types/translation.ts`).
 */
export function TranslationAnswerable({
  items,
  answers,
  onAnswerChange,
  disabled,
}: {
  items: AssignmentContentEntry<TranslationContent>[];
  answers: Record<string, TranslationAnswer | undefined>;
  onAnswerChange: (itemId: string, answer: TranslationAnswer) => void;
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
      {items.map((item, index) => {
        const selected = answers[item.itemId]?.selectedIndex;

        return (
          <li key={item.itemId}>
            <p className="font-medium">
              {index + 1}. {item.content.source}
            </p>

            {item.content.mode === "INDEXING" ? (
              <div className="mt-1 space-y-1 text-sm">
                <ol className="list-decimal space-y-1 pl-5">
                  {item.content.options.map((option, i) => (
                    <li key={i}>{option}</li>
                  ))}
                </ol>
                <input
                  type="number"
                  min={1}
                  max={item.content.options.length}
                  aria-label={`Número da opção certa (questão ${index + 1})`}
                  disabled={disabled}
                  value={selected === undefined ? "" : selected + 1}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    onAnswerChange(item.itemId, {
                      selectedIndex: Number.isInteger(n) ? n - 1 : -1,
                    });
                  }}
                  className="mt-1 w-40 rounded border border-border px-1 text-sm"
                />
              </div>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {item.content.options.map((option, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`item-${item.itemId}`}
                      checked={selected === i}
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
            )}
          </li>
        );
      })}
    </ol>
  );
}
