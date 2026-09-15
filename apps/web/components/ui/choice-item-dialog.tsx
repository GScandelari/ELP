"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { DialogFormFooter } from "@/components/ui/dialog-form-footer";
import { PointsField } from "@/components/ui/points-field";
import { OptionsWithCorrectField } from "@/components/ui/options-with-correct-field";
import { useOptionsWithCorrect } from "@/lib/use-options-with-correct";

/**
 * Scaffold compartilhado pelos diálogos de item "escolha a alternativa
 * certa" (Multiple Choice, Translation): estado de opções/pontos/erro,
 * envio e o esqueleto do formulário. Cada tipo só entra com os campos
 * que são dele (`extraFields`) e como montar a `configuration` a partir
 * deles + das opções (`buildConfiguration`).
 */
export function ChoiceItemDialog<
  TConfig,
  TInput extends { configuration: TConfig; points: number },
>({
  open,
  onClose,
  headingId,
  title,
  extraFields,
  optionsLegend,
  radioGroupName,
  optionLabel,
  blankOptionError,
  initialOptions,
  initialCorrectIndex,
  initialPoints,
  buildConfiguration,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  headingId: string;
  title: string;
  extraFields: ReactNode;
  optionsLegend: string;
  radioGroupName: string;
  optionLabel: string;
  blankOptionError: string;
  initialOptions: string[];
  initialCorrectIndex: number;
  initialPoints: number;
  buildConfiguration: (options: string[], correctIndex: number) => TConfig;
  onSubmit: (input: TInput) => Promise<void>;
}) {
  const {
    options,
    correctIndex,
    setCorrectIndex,
    updateOption,
    addOption,
    removeOption,
  } = useOptionsWithCorrect(initialOptions, initialCorrectIndex);
  const [points, setPoints] = useState(initialPoints);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmedOptions = options.map((o) => o.trim());
    if (trimmedOptions.some((o) => o.length === 0)) {
      setError(blankOptionError);
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        configuration: buildConfiguration(trimmedOptions, correctIndex),
        points,
      } as unknown as TInput);
      onClose();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy={headingId}>
      <h2 id={headingId} className="text-lg font-bold">
        {title}
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {extraFields}

        <OptionsWithCorrectField
          legend={optionsLegend}
          radioGroupName={radioGroupName}
          optionLabel={optionLabel}
          options={options}
          correctIndex={correctIndex}
          onUpdateOption={updateOption}
          onAddOption={addOption}
          onRemoveOption={removeOption}
          onSetCorrectIndex={setCorrectIndex}
        />

        <PointsField
          id={`${headingId}-points`}
          value={points}
          onChange={setPoints}
        />

        <DialogFormFooter error={error} busy={busy} onCancel={onClose} />
      </form>
    </Dialog>
  );
}
