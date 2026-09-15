"use client";

import { useState } from "react";
import { ChoiceItemDialog } from "@/components/ui/choice-item-dialog";
import type { MultipleChoiceItemInput } from "@/lib/multiple-choice";

export function MultipleChoiceItemDialog({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  /** Presente = editando um item existente; ausente = criando um novo. */
  initial?: MultipleChoiceItemInput;
  onSubmit: (input: MultipleChoiceItemInput) => Promise<void>;
}) {
  const [question, setQuestion] = useState(
    initial?.configuration.question ?? "",
  );

  return (
    <ChoiceItemDialog
      open={open}
      onClose={onClose}
      headingId="mc-item-heading"
      title={initial ? "Editar questão" : "Nova questão"}
      extraFields={
        <div>
          <label htmlFor="mc-question" className="block text-sm font-medium">
            Enunciado
          </label>
          <textarea
            id="mc-question"
            required
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      }
      optionsLegend="Alternativas (marque a correta)"
      radioGroupName="mc-correct"
      optionLabel="Alternativa"
      blankOptionError="Nenhuma alternativa pode ficar em branco."
      initialOptions={initial?.configuration.options ?? ["", ""]}
      initialCorrectIndex={initial?.configuration.correctIndex ?? 0}
      initialPoints={initial?.points ?? 1}
      buildConfiguration={(options, correctIndex) => ({
        question: question.trim(),
        options,
        correctIndex,
      })}
      onSubmit={onSubmit}
    />
  );
}
