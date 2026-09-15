"use client";

import type { Unsubscribe } from "firebase/firestore";
import {
  addActivityItem,
  updateActivityItem,
  watchActivityItems,
  type ActivityItem,
} from "@/lib/activity-items";

export type FillInBlanksMode = "TYPING" | "WORD_BANK";

export type FillInBlanksBlank = {
  id: string;
  answer: string;
  acceptedAnswers?: string[];
};

/** `text` marca cada espaço com `{{id}}`, ex.: "I usually {{1}} up at 7." */
export type FillInBlanksConfig = {
  mode: FillInBlanksMode;
  text: string;
  blanks: FillInBlanksBlank[];
  /** Obrigatório quando `mode === 'WORD_BANK'` — precisa conter todas as respostas certas. */
  wordBank?: string[];
};

export type FillInBlanksItem = ActivityItem<FillInBlanksConfig>;

export type FillInBlanksItemInput = {
  configuration: FillInBlanksConfig;
  points: number;
};

export function watchFillInBlanksItems(
  activityId: string,
  uid: string,
  onChange: (items: FillInBlanksItem[]) => void,
): Unsubscribe {
  return watchActivityItems<FillInBlanksConfig>(activityId, uid, onChange);
}

function summarize(config: FillInBlanksConfig): string {
  // remove os marcadores {{id}} pra virar um resumo curto e legível
  return config.text.replace(/\{\{[^}]+\}\}/g, "___");
}

export async function addFillInBlanksItem(
  activityId: string,
  uid: string,
  nextPosition: number,
  input: FillInBlanksItemInput,
): Promise<void> {
  await addActivityItem(activityId, uid, nextPosition, {
    ...input,
    prompt: summarize(input.configuration),
  });
}

export async function updateFillInBlanksItem(
  activityId: string,
  itemId: string,
  input: FillInBlanksItemInput,
): Promise<void> {
  await updateActivityItem(activityId, itemId, {
    ...input,
    prompt: summarize(input.configuration),
  });
}
