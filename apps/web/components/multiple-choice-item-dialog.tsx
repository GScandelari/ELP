"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { DialogFormFooter } from "@/components/ui/dialog-form-footer";
import { PointsField } from "@/components/ui/points-field";
import { OptionsWithCorrectField } from "@/components/ui/options-with-correct-field";
import { useOptionsWithCorrect } from "@/lib/use-options-with-correct";
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
  const {
    options,
    correctIndex,
    setCorrectIndex,
    updateOption,
    addOption,
    removeOption,
  } = useOptionsWithCorrect(
    initial?.configuration.options ?? ["", ""],
    initial?.configuration.correctIndex ?? 0,
  );
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmedOptions = options.map((o) => o.trim());
    if (trimmedOptions.some((o) => o.length === 0)) {
      setError("Nenhuma alternativa pode ficar em branco.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        configuration: {
          question: question.trim(),
          options: trimmedOptions,
          correctIndex,
        },
        points,
      });
      onClose();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy="mc-item-heading">
      <h2 id="mc-item-heading" className="text-lg font-bold">
        {initial ? "Editar questão" : "Nova questão"}
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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

        <OptionsWithCorrectField
          legend="Alternativas (marque a correta)"
          radioGroupName="mc-correct"
          optionLabel="Alternativa"
          options={options}
          correctIndex={correctIndex}
          onUpdateOption={updateOption}
          onAddOption={addOption}
          onRemoveOption={removeOption}
          onSetCorrectIndex={setCorrectIndex}
        />

        <PointsField id="mc-points" value={points} onChange={setPoints} />

        <DialogFormFooter error={error} busy={busy} onCancel={onClose} />
      </form>
    </Dialog>
  );
}
