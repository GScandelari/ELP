"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MultipleChoiceItemDialog } from "@/components/multiple-choice-item-dialog";
import {
  addMultipleChoiceItem,
  deleteActivityItem,
  swapActivityItemPositions,
  updateMultipleChoiceItem,
  watchActivityItems,
  type ActivityItem,
} from "@/lib/activity-items";

/**
 * Builder + preview do dono para o tipo Multiple Choice (RF-009/9.4).
 * `readOnly` esconde as ações de edição — usado quando a atividade está
 * `locked` (ADR-014): o professor ainda vê as questões, mas não mexe.
 */
export function MultipleChoiceBuilder({
  activityId,
  uid,
  readOnly = false,
}: {
  activityId: string;
  uid: string;
  readOnly?: boolean;
}) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityItem | null>(null);

  useEffect(
    () => watchActivityItems(activityId, uid, setItems),
    [activityId, uid],
  );

  if (items === null) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "questão" : "questões"}
        </p>
        {!readOnly && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            Adicionar questão
          </Button>
        )}
      </div>

      {items.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma questão ainda.
        </p>
      )}

      <ul aria-label="Questões cadastradas" className="mt-3 space-y-3">
        {items.map((item, index) => (
          <li key={item.id} className="rounded-md border border-border p-3">
            <p className="font-medium">{item.configuration.question}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {item.configuration.options.map((option, i) => (
                <li
                  key={i}
                  className={
                    i === item.configuration.correctIndex
                      ? "font-medium text-green-700"
                      : "text-muted-foreground"
                  }
                >
                  {i === item.configuration.correctIndex ? "✓ " : "— "}
                  {option}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {item.points} {item.points === 1 ? "ponto" : "pontos"}
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
                    if (confirm("Remover esta questão?")) {
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
        <MultipleChoiceItemDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          initial={
            editing
              ? { configuration: editing.configuration, points: editing.points }
              : undefined
          }
          onSubmit={(input) =>
            editing
              ? updateMultipleChoiceItem(activityId, editing.id, input)
              : addMultipleChoiceItem(activityId, uid, items.length, input)
          }
        />
      )}
    </div>
  );
}
