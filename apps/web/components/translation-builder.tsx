"use client";

import { ActivityItemListBuilder } from "@/components/activity-item-list-builder";
import { TranslationItemDialog } from "@/components/translation-item-dialog";
import {
  addTranslationItem,
  updateTranslationItem,
  watchTranslationItems,
} from "@/lib/translation";

/**
 * Builder + preview do dono para o tipo Translation/Localization
 * (RF-009/9.3). `readOnly` esconde as ações de edição — usado quando a
 * atividade está `locked` (ADR-014).
 */
export function TranslationBuilder({
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
      watchItems={watchTranslationItems}
      addItem={addTranslationItem}
      updateItem={updateTranslationItem}
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
          <p className="font-medium">{item.configuration.source}</p>
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
            {item.configuration.mode === "INDEXING"
              ? "Digitar o número da certa"
              : "Marcar a alternativa certa"}{" "}
            · {item.points} {item.points === 1 ? "ponto" : "pontos"}
          </p>
        </>
      )}
      renderDialog={({ open, onClose, initial, onSubmit }) => (
        <TranslationItemDialog
          open={open}
          onClose={onClose}
          initial={initial}
          onSubmit={onSubmit}
        />
      )}
    />
  );
}
