"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  deleteActivityItem,
  swapActivityItemPositions,
  type ActivityItem,
} from "@/lib/activity-items";

type WatchItems<TConfig> = (
  activityId: string,
  uid: string,
  onChange: (items: ActivityItem<TConfig>[]) => void,
) => () => void;

type SubmitItem<TInput> = (
  activityId: string,
  uid: string,
  nextPosition: number,
  input: TInput,
) => Promise<void>;

type UpdateItem<TInput> = (
  activityId: string,
  itemId: string,
  input: TInput,
) => Promise<void>;

/**
 * Chrome comum a todo Builder de itens de atividade: contador, botão de
 * adicionar, lista com mover para cima/baixo/editar/remover e o diálogo de
 * criação/edição. Cada tipo (Multiple Choice, Fill in the Blanks, ...) só
 * fornece o que é específico dele — como renderizar um item e o diálogo.
 */
export function ActivityItemListBuilder<TConfig, TInput>({
  activityId,
  uid,
  readOnly = false,
  watchItems,
  addItem,
  updateItem,
  labels,
  renderItem,
  renderDialog,
}: {
  activityId: string;
  uid: string;
  readOnly?: boolean;
  watchItems: WatchItems<TConfig>;
  addItem: SubmitItem<TInput>;
  updateItem: UpdateItem<TInput>;
  labels: {
    singular: string;
    plural: string;
    addButton: string;
    empty: string;
    listAriaLabel: string;
    confirmRemove: string;
  };
  renderItem: (item: ActivityItem<TConfig>) => ReactNode;
  renderDialog: (props: {
    open: boolean;
    onClose: () => void;
    initial: { configuration: TConfig; points: number } | undefined;
    onSubmit: (input: TInput) => Promise<void>;
  }) => ReactNode;
}) {
  const [items, setItems] = useState<ActivityItem<TConfig>[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityItem<TConfig> | null>(null);

  useEffect(
    () => watchItems(activityId, uid, setItems),
    [activityId, uid, watchItems],
  );

  if (items === null) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? labels.singular : labels.plural}
        </p>
        {!readOnly && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            {labels.addButton}
          </Button>
        )}
      </div>

      {items.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">{labels.empty}</p>
      )}

      <ul aria-label={labels.listAriaLabel} className="mt-3 space-y-3">
        {items.map((item, index) => (
          <li key={item.id} className="rounded-md border border-border p-3">
            {renderItem(item)}

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
                    if (confirm(labels.confirmRemove)) {
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

      {!readOnly &&
        renderDialog({
          open: dialogOpen,
          onClose: () => setDialogOpen(false),
          initial: editing
            ? { configuration: editing.configuration, points: editing.points }
            : undefined,
          onSubmit: (input) =>
            editing
              ? updateItem(activityId, editing.id, input)
              : addItem(activityId, uid, items.length, input),
        })}
    </div>
  );
}
