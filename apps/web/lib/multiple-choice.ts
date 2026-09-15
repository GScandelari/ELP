"use client";

import type { Unsubscribe } from "firebase/firestore";
import {
  addActivityItem,
  updateActivityItem,
  watchActivityItems,
  type ActivityItem,
} from "@/lib/activity-items";

export type MultipleChoiceConfig = {
  question: string;
  options: string[];
  correctIndex: number;
};

export type MultipleChoiceItem = ActivityItem<MultipleChoiceConfig>;

export type MultipleChoiceItemInput = {
  configuration: MultipleChoiceConfig;
  points: number;
};

export function watchMultipleChoiceItems(
  activityId: string,
  uid: string,
  onChange: (items: MultipleChoiceItem[]) => void,
): Unsubscribe {
  return watchActivityItems<MultipleChoiceConfig>(activityId, uid, onChange);
}

export async function addMultipleChoiceItem(
  activityId: string,
  uid: string,
  nextPosition: number,
  input: MultipleChoiceItemInput,
): Promise<void> {
  await addActivityItem(activityId, uid, nextPosition, {
    ...input,
    prompt: input.configuration.question,
  });
}

export async function updateMultipleChoiceItem(
  activityId: string,
  itemId: string,
  input: MultipleChoiceItemInput,
): Promise<void> {
  await updateActivityItem(activityId, itemId, {
    ...input,
    prompt: input.configuration.question,
  });
}
