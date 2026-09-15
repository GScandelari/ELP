"use client";

import { ActivityItemListBuilder } from "@/components/activity-item-list-builder";
import { FillInBlanksItemDialog } from "@/components/fill-in-blanks-item-dialog";
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
  return (
    <ActivityItemListBuilder
      activityId={activityId}
      uid={uid}
      readOnly={readOnly}
      watchItems={watchFillInBlanksItems}
      addItem={addFillInBlanksItem}
      updateItem={updateFillInBlanksItem}
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
          <p className="font-medium">{renderWithAnswers(item)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.configuration.mode === "WORD_BANK"
              ? "Banco de palavras"
              : "Digitar a resposta"}{" "}
            · {item.points} {item.points === 1 ? "ponto" : "pontos"}
          </p>
        </>
      )}
      renderDialog={({ open, onClose, initial, onSubmit }) => (
        <FillInBlanksItemDialog
          open={open}
          onClose={onClose}
          initial={initial}
          onSubmit={onSubmit}
        />
      )}
    />
  );
}
