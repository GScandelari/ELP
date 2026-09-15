"use client";

import { Button } from "@/components/ui/button";
import { MAX_OPTIONS, MIN_OPTIONS } from "@/lib/use-options-with-correct";

export { MAX_OPTIONS, MIN_OPTIONS };

/**
 * Lista de alternativas com "marque a correta" (rádio) — compartilhada
 * pelos diálogos de item que pedem esse formato (Multiple Choice,
 * Translation). `optionLabel` nomeia cada alternativa nos rótulos
 * (ex.: "Alternativa", "Opção").
 */
export function OptionsWithCorrectField({
  legend,
  radioGroupName,
  optionLabel,
  options,
  correctIndex,
  onUpdateOption,
  onAddOption,
  onRemoveOption,
  onSetCorrectIndex,
}: {
  legend: string;
  radioGroupName: string;
  optionLabel: string;
  options: string[];
  correctIndex: number;
  onUpdateOption: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onSetCorrectIndex: (index: number) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 space-y-2">
        {options.map((option, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name={radioGroupName}
              checked={correctIndex === i}
              onChange={() => onSetCorrectIndex(i)}
              aria-label={`${optionLabel} ${i + 1} é a correta`}
            />
            <input
              required
              value={option}
              onChange={(e) => onUpdateOption(i, e.target.value)}
              aria-label={`${optionLabel} ${i + 1}`}
              className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm"
            />
            {options.length > MIN_OPTIONS && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveOption(i)}
                aria-label={`Remover ${optionLabel.toLowerCase()} ${i + 1}`}
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
          onClick={onAddOption}
        >
          Adicionar {optionLabel.toLowerCase()}
        </Button>
      )}
    </fieldset>
  );
}
