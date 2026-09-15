"use client";

import { ActivityItemListBuilder } from "@/components/activity-item-list-builder";
import { MeaningMatchingItemDialog } from "@/components/meaning-matching-item-dialog";
import {
  addMeaningMatchingItem,
  updateMeaningMatchingItem,
  watchMeaningMatchingItems,
} from "@/lib/meaning-matching";

/**
 * Builder + preview do dono para o tipo Meaning Matching (RF-009/9.2).
 * `readOnly` esconde as ações de edição — usado quando a atividade está
 * `locked` (ADR-014).
 */
export function MeaningMatchingBuilder({
  activityId,
  uid,
  readOnly = false,
}: {
  activityId: string;
  uid: string;
  readOnly?: boolean;
}) {
  return (
    <ActivityItemListBuilder
      activityId={activityId}
      uid={uid}
      readOnly={readOnly}
      watchItems={watchMeaningMatchingItems}
      addItem={addMeaningMatchingItem}
      updateItem={updateMeaningMatchingItem}
      labels={{
        singular: "item",
        plural: "itens",
        addButton: "Adicionar item",
        empty: "Nenhum item ainda.",
        listAriaLabel: "Itens cadastrados",
        confirmRemove: "Remover este item?",
      }}
      renderItem={(item) => (
        <>
          <ul className="space-y-1 text-sm">
            {item.configuration.pairs.map((pair, i) => (
              <li key={i} className="font-medium">
                {pair.left} → {pair.right}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            {item.points} {item.points === 1 ? "ponto" : "pontos"}
          </p>
        </>
      )}
      renderDialog={({ open, onClose, initial, onSubmit }) => (
        <MeaningMatchingItemDialog
          open={open}
          onClose={onClose}
          initial={initial}
          onSubmit={onSubmit}
        />
      )}
    />
  );
}
