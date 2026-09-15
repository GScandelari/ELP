"use client";

import type { Unsubscribe } from "firebase/firestore";
import {
  addActivityItem,
  updateActivityItem,
  watchActivityItems,
  type ActivityItem,
} from "@/lib/activity-items";

export type TranslationMode = "MULTIPLE_CHOICE" | "INDEXING";

export type TranslationConfig = {
  mode: TranslationMode;
  source: string;
  options: string[];
  correctIndex: number;
};

export type TranslationItem = ActivityItem<TranslationConfig>;

export type TranslationItemInput = {
  configuration: TranslationConfig;
  points: number;
};

export function watchTranslationItems(
  activityId: string,
  uid: string,
  onChange: (items: TranslationItem[]) => void,
): Unsubscribe {
  return watchActivityItems<TranslationConfig>(activityId, uid, onChange);
}

export async function addTranslationItem(
  activityId: string,
  uid: string,
  nextPosition: number,
  input: TranslationItemInput,
): Promise<void> {
  await addActivityItem(activityId, uid, nextPosition, {
    ...input,
    prompt: input.configuration.source,
  });
}

export async function updateTranslationItem(
  activityId: string,
  itemId: string,
  input: TranslationItemInput,
): Promise<void> {
  await updateActivityItem(activityId, itemId, {
    ...input,
    prompt: input.configuration.source,
  });
}
