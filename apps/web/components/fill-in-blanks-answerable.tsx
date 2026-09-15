"use client";

import type { AssignmentContentEntry } from "@/lib/assignments";

export type FillInBlanksAnswer = { values: Record<string, string> };

type FillInBlanksContent = {
  mode: "TYPING" | "WORD_BANK";
  text: string;
  blankIds: string[];
  wordBank?: string[];
};

/**
 * Versão interativa do `FillInBlanksRenderer` (Fase 3) — captura a
 * resposta do aluno em vez de só exibir. Não sabe nada de correção; só
 * produz o formato `TAnswer` que `submitAttempt`/`score()` do handler
 * espera (Fase 3, `functions/src/activity-types/fill-in-blanks.ts`).
 */
export function FillInBlanksAnswerable({
  items,
  answers,
  onAnswerChange,
  disabled,
}: {
  items: AssignmentContentEntry<FillInBlanksContent>[];
  answers: Record<string, FillInBlanksAnswer | undefined>;
  onAnswerChange: (itemId: string, answer: FillInBlanksAnswer) => void;
  disabled: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum item nesta atividade.
      </p>
    );
  }

  function handleBlankChange(itemId: string, blankId: string, value: string) {
    const current = answers[itemId]?.values ?? {};
    onAnswerChange(itemId, { values: { ...current, [blankId]: value } });
  }

  return (
    <ol className="space-y-6">
      {items.map((item, index) => {
        const values = answers[item.itemId]?.values ?? {};
        let blankIndex = 0;

        return (
          <li key={item.itemId}>
            <p>
              {index + 1}.{" "}
              {item.content.text.split(/(\{\{[^}]+\}\})/g).map((part, i) => {
                const match = /^\{\{([^}]+)\}\}$/.exec(part);
                if (!match) return <span key={i}>{part}</span>;

                // o grupo é sempre capturado quando o regex casa (sem parte
                // opcional) - garantido pelo próprio padrão, não pelo tipo
                const blankId = match[1] as string;
                blankIndex += 1;
                const label = `Espaço ${blankIndex} da questão ${index + 1}`;

                if (item.content.mode === "WORD_BANK") {
                  return (
                    <select
                      key={i}
                      aria-label={label}
                      disabled={disabled}
                      value={values[blankId] ?? ""}
                      onChange={(e) =>
                        handleBlankChange(item.itemId, blankId, e.target.value)
                      }
                      className="mx-1 rounded border border-border px-1 text-sm"
                    >
                      <option value="">—</option>
                      {(item.content.wordBank ?? []).map((word) => (
                        <option key={word} value={word}>
                          {word}
                        </option>
                      ))}
                    </select>
                  );
                }

                return (
                  <input
                    key={i}
                    aria-label={label}
                    disabled={disabled}
                    value={values[blankId] ?? ""}
                    onChange={(e) =>
                      handleBlankChange(item.itemId, blankId, e.target.value)
                    }
                    className="mx-1 w-24 rounded border border-border px-1 text-sm"
                  />
                );
              })}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
