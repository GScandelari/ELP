"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DialogFormFooter } from "@/components/ui/dialog-form-footer";
import { PointsField } from "@/components/ui/points-field";
import type { MeaningMatchingItemInput } from "@/lib/meaning-matching";

const MIN_PAIRS = 2;
const MAX_PAIRS = 8;

type Row = { left: string; right: string };

export function MeaningMatchingItemDialog({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  /** Presente = editando um item existente; ausente = criando um novo. */
  initial?: MeaningMatchingItemInput;
  onSubmit: (input: MeaningMatchingItemInput) => Promise<void>;
}) {
  const [rows, setRows] = useState<Row[]>(
    initial?.configuration.pairs.map((p) => ({
      left: p.left,
      right: p.right,
    })) ?? [
      { left: "", right: "" },
      { left: "", right: "" },
    ],
  );
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateRow(index: number, side: "left" | "right", value: string) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [side]: value } : row)),
    );
  }

  function addRow() {
    setRows((prev) =>
      prev.length < MAX_PAIRS ? [...prev, { left: "", right: "" }] : prev,
    );
  }

  function removeRow(index: number) {
    setRows((prev) =>
      prev.length > MIN_PAIRS ? prev.filter((_, i) => i !== index) : prev,
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmedRows = rows.map((r) => ({
      left: r.left.trim(),
      right: r.right.trim(),
    }));
    if (trimmedRows.some((r) => r.left.length === 0 || r.right.length === 0)) {
      setError("Nenhum dos dois lados de um par pode ficar em branco.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        configuration: {
          pairs: trimmedRows.map((r, i) => ({ id: String(i + 1), ...r })),
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
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="meaning-matching-item-heading"
    >
      <h2 id="meaning-matching-item-heading" className="text-lg font-bold">
        {initial ? "Editar item" : "Novo item"}
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <fieldset>
          <legend className="text-sm font-medium">
            Pares (termo e significado)
          </legend>
          <div className="mt-2 space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  required
                  value={row.left}
                  onChange={(e) => updateRow(i, "left", e.target.value)}
                  aria-label={`Termo ${i + 1}`}
                  placeholder="Termo"
                  className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm"
                />
                <span className="text-muted-foreground">→</span>
                <input
                  required
                  value={row.right}
                  onChange={(e) => updateRow(i, "right", e.target.value)}
                  aria-label={`Significado ${i + 1}`}
                  placeholder="Significado"
                  className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm"
                />
                {rows.length > MIN_PAIRS && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(i)}
                    aria-label={`Remover par ${i + 1}`}
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
          </div>
          {rows.length < MAX_PAIRS && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={addRow}
            >
              Adicionar par
            </Button>
          )}
        </fieldset>

        <PointsField
          id="meaning-matching-points"
          value={points}
          onChange={setPoints}
        />

        <DialogFormFooter error={error} busy={busy} onCancel={onClose} />
      </form>
    </Dialog>
  );
}
