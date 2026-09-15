"use client";

import { useState } from "react";
import { ChoiceItemDialog } from "@/components/ui/choice-item-dialog";
import type {
  TranslationItemInput,
  TranslationMode,
} from "@/lib/translation";

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

  return (
    <ChoiceItemDialog
      open={open}
      onClose={onClose}
      headingId="translation-item-heading"
      title={initial ? "Editar item" : "Novo item"}
      extraFields={
        <>
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
              <option value="MULTIPLE_CHOICE">
                Marcar a alternativa certa
              </option>
              <option value="INDEXING">Digitar o número da certa</option>
            </select>
          </div>
        </>
      }
      optionsLegend="Opções de tradução (marque a correta)"
      radioGroupName="translation-correct"
      optionLabel="Opção"
      blankOptionError="Nenhuma opção pode ficar em branco."
      initialOptions={initial?.configuration.options ?? ["", ""]}
      initialCorrectIndex={initial?.configuration.correctIndex ?? 0}
      initialPoints={initial?.points ?? 1}
      buildConfiguration={(options, correctIndex) => ({
        mode,
        source: source.trim(),
        options,
        correctIndex,
      })}
      onSubmit={onSubmit}
    />
  );
}
