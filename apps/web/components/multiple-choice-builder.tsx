"use client";

import { ActivityItemListBuilder } from "@/components/activity-item-list-builder";
import { MultipleChoiceItemDialog } from "@/components/multiple-choice-item-dialog";
import {
  addMultipleChoiceItem,
  updateMultipleChoiceItem,
  watchMultipleChoiceItems,
} from "@/lib/multiple-choice";

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
  return (
    <ActivityItemListBuilder
      activityId={activityId}
      uid={uid}
      readOnly={readOnly}
      watchItems={watchMultipleChoiceItems}
      addItem={addMultipleChoiceItem}
      updateItem={updateMultipleChoiceItem}
      labels={{
        singular: "questão",
        plural: "questões",
        addButton: "Adicionar questão",
        empty: "Nenhuma questão ainda.",
        listAriaLabel: "Questões cadastradas",
        confirmRemove: "Remover esta questão?",
      }}
      renderItem={(item) => (
        <>
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
        </>
      )}
      renderDialog={({ open, onClose, initial, onSubmit }) => (
        <MultipleChoiceItemDialog
          open={open}
          onClose={onClose}
          initial={initial}
          onSubmit={onSubmit}
        />
      )}
    />
  );
}
