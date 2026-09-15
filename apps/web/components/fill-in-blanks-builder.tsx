"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FillInBlanksItemDialog } from "@/components/fill-in-blanks-item-dialog";
import {
  deleteActivityItem,
  swapActivityItemPositions,
} from "@/lib/activity-items";
import {
  addFillInBlanksItem,
  updateFillInBlanksItem,
  watchFillInBlanksItems,
  type FillInBlanksItem,
} from "@/lib/fill-in-blanks";

/** Mostra o texto com as respostas entre colchetes, pra visão do dono. */
function renderWithAnswers(item: FillInBlanksItem): string {
  const blanksById = new Map(item.configuration.blanks.map((b) => [b.id, b]));
  return item.configuration.text.replace(/\{\{([^}]+)\}\}/g, (match, id) => {
    const blank = blanksById.get(id);
    return blank ? `[${blank.answer}]` : match;
  });
}

/**
 * Builder + preview do dono para o tipo Fill in the Blanks (RF-009/9.1).
 * `readOnly` esconde as ações de edição — usado quando a atividade está
 * `locked` (ADR-014).
 */
export function FillInBlanksBuilder({
  activityId,
  uid,
  readOnly = false,
}: {
  activityId: string;
  uid: string;
  readOnly?: boolean;
}) {
  const [items, setItems] = useState<FillInBlanksItem[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FillInBlanksItem | null>(null);

  useEffect(
    () => watchFillInBlanksItems(activityId, uid, setItems),
    [activityId, uid],
  );

  if (items === null) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "itens"}
        </p>
        {!readOnly && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            Adicionar item
          </Button>
        )}
      </div>

      {items.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum item ainda.</p>
      )}

      <ul aria-label="Itens cadastrados" className="mt-3 space-y-3">
        {items.map((item, index) => (
          <li key={item.id} className="rounded-md border border-border p-3">
            <p className="font-medium">{renderWithAnswers(item)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.configuration.mode === "WORD_BANK"
                ? "Banco de palavras"
                : "Digitar a resposta"}{" "}
              · {item.points} {item.points === 1 ? "ponto" : "pontos"}
            </p>

            {!readOnly && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(item);
                    setDialogOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={index === 0}
                  onClick={() =>
                    swapActivityItemPositions(
                      activityId,
                      item,
                      items[index - 1]!,
                    )
                  }
                >
                  Mover para cima
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={index === items.length - 1}
                  onClick={() =>
                    swapActivityItemPositions(
                      activityId,
                      item,
                      items[index + 1]!,
                    )
                  }
                >
                  Mover para baixo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm("Remover este item?")) {
                      void deleteActivityItem(activityId, item.id);
                    }
                  }}
                >
                  Remover
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {!readOnly && (
        <FillInBlanksItemDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          initial={
            editing
              ? { configuration: editing.configuration, points: editing.points }
              : undefined
          }
          onSubmit={(input) =>
            editing
              ? updateFillInBlanksItem(activityId, editing.id, input)
              : addFillInBlanksItem(activityId, uid, items.length, input)
          }
        />
      )}
    </div>
  );
}
