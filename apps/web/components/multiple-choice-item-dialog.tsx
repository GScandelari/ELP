"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { MultipleChoiceItemInput } from "@/lib/multiple-choice";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

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
  const [options, setOptions] = useState<string[]>(
    initial?.configuration.options ?? ["", ""],
  );
  const [correctIndex, setCorrectIndex] = useState(
    initial?.configuration.correctIndex ?? 0,
  );
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

        <fieldset>
          <legend className="text-sm font-medium">
            Alternativas (marque a correta)
          </legend>
          <div className="mt-2 space-y-2">
            {options.map((option, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mc-correct"
                  checked={correctIndex === i}
                  onChange={() => setCorrectIndex(i)}
                  aria-label={`Alternativa ${i + 1} é a correta`}
                />
                <input
                  required
                  value={option}
                  onChange={(e) => updateOption(i, e.target.value)}
                  aria-label={`Alternativa ${i + 1}`}
                  className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm"
                />
                {options.length > MIN_OPTIONS && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(i)}
                    aria-label={`Remover alternativa ${i + 1}`}
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
          </div>
          {options.length < MAX_OPTIONS && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={addOption}
            >
              Adicionar alternativa
            </Button>
          )}
        </fieldset>

        <div>
          <label htmlFor="mc-points" className="block text-sm font-medium">
            Pontos
          </label>
          <input
            id="mc-points"
            type="number"
            min={1}
            required
            value={points}
            onChange={(e) => setPoints(Number(e.target.value) || 1)}
            className="mt-1 h-10 w-24 rounded-md border border-border bg-background px-3 text-sm"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
