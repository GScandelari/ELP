"use client";

import type { Unsubscribe } from "firebase/firestore";
import {
  addActivityItem,
  updateActivityItem,
  watchActivityItems,
  type ActivityItem,
} from "@/lib/activity-items";

export type MeaningMatchingPair = {
  id: string;
  left: string;
  right: string;
};

export type MeaningMatchingConfig = {
  pairs: MeaningMatchingPair[];
};

export type MeaningMatchingItem = ActivityItem<MeaningMatchingConfig>;

export type MeaningMatchingItemInput = {
  configuration: MeaningMatchingConfig;
  points: number;
};

export function watchMeaningMatchingItems(
  activityId: string,
  uid: string,
  onChange: (items: MeaningMatchingItem[]) => void,
): Unsubscribe {
  return watchActivityItems<MeaningMatchingConfig>(activityId, uid, onChange);
}

function toItemInput(input: MeaningMatchingItemInput) {
  return {
    ...input,
    prompt: input.configuration.pairs.map((p) => p.left).join(" · "),
  };
}

export async function addMeaningMatchingItem(
  activityId: string,
  uid: string,
  nextPosition: number,
  input: MeaningMatchingItemInput,
): Promise<void> {
  await addActivityItem(activityId, uid, nextPosition, toItemInput(input));
}

export async function updateMeaningMatchingItem(
  activityId: string,
  itemId: string,
  input: MeaningMatchingItemInput,
): Promise<void> {
  await updateActivityItem(activityId, itemId, toItemInput(input));
}
