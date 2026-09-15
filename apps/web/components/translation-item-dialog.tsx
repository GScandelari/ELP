"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { DialogFormFooter } from "@/components/ui/dialog-form-footer";
import { PointsField } from "@/components/ui/points-field";
import { OptionsWithCorrectField } from "@/components/ui/options-with-correct-field";
import { useOptionsWithCorrect } from "@/lib/use-options-with-correct";
import type { TranslationItemInput, TranslationMode } from "@/lib/translation";

export function TranslationItemDialog({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  /** Presente = editando um item existente; ausente = criando um novo. */
  initial?: TranslationItemInput;
  onSubmit: (input: TranslationItemInput) => Promise<void>;
}) {
  const [mode, setMode] = useState<TranslationMode>(
    initial?.configuration.mode ?? "MULTIPLE_CHOICE",
  );
  const [source, setSource] = useState(initial?.configuration.source ?? "");
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
      setError("Nenhuma opção pode ficar em branco.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        configuration: {
          mode,
          source: source.trim(),
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
    <Dialog open={open} onClose={onClose} labelledBy="translation-item-heading">
      <h2 id="translation-item-heading" className="text-lg font-bold">
        {initial ? "Editar item" : "Novo item"}
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="translation-source"
            className="block text-sm font-medium"
          >
            Palavra ou frase a traduzir
          </label>
          <input
            id="translation-source"
            required
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="translation-mode"
            className="block text-sm font-medium"
          >
            Modo
          </label>
          <select
            id="translation-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as TranslationMode)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="MULTIPLE_CHOICE">Marcar a alternativa certa</option>
            <option value="INDEXING">Digitar o número da certa</option>
          </select>
        </div>

        <OptionsWithCorrectField
          legend="Opções de tradução (marque a correta)"
          radioGroupName="translation-correct"
          optionLabel="Opção"
          options={options}
          correctIndex={correctIndex}
          onUpdateOption={updateOption}
          onAddOption={addOption}
          onRemoveOption={removeOption}
          onSetCorrectIndex={setCorrectIndex}
        />

        <PointsField
          id="translation-points"
          value={points}
          onChange={setPoints}
        />

        <DialogFormFooter error={error} busy={busy} onCancel={onClose} />
      </form>
    </Dialog>
  );
}
