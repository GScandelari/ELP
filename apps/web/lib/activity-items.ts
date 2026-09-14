"use client";

import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";

/**
 * `configuration` do item — só Multiple Choice existe até agora (PR 3.3).
 * Os outros tipos chegam nas próximas PRs da Fase 3, cada um com o
 * próprio módulo (mesmo padrão de `lib/classes.ts`/`lib/activities.ts`).
 */
export type MultipleChoiceConfig = {
  question: string;
  options: string[];
  correctIndex: number;
};

export type ActivityItem = {
  id: string;
  position: number;
  points: number;
  configuration: MultipleChoiceConfig;
};

function mapItem(
  id: string,
  data: DocumentData | undefined,
): ActivityItem | null {
  if (!data) return null;
  return {
    id,
    position: data.position ?? 0,
    points: data.points ?? 1,
    configuration: data.configuration ?? {
      question: "",
      options: [],
      correctIndex: 0,
    },
  };
}

/** Observa os itens de uma atividade, em ordem. */
export function watchActivityItems(
  activityId: string,
  uid: string,
  onChange: (items: ActivityItem[]) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collection(db, "activities", activityId, "items"),
    where("accountId", "==", uid),
    orderBy("position", "asc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs
          .map((d) => mapItem(d.id, d.data()))
          .filter((i): i is ActivityItem => i !== null),
      );
    },
    () => onChange([]),
  );
}

export type MultipleChoiceItemInput = {
  configuration: MultipleChoiceConfig;
  points: number;
};

/**
 * Cria um item e incrementa `activities/{id}.itemCount` na mesma escrita
 * (writeBatch — o client SDK também tem transação/lote atômico, não é
 * só o Admin SDK). A rule de `items.create` já exige dono + não travada.
 */
export async function addMultipleChoiceItem(
  activityId: string,
  uid: string,
  nextPosition: number,
  input: MultipleChoiceItemInput,
): Promise<void> {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  const itemRef = doc(collection(db, "activities", activityId, "items"));
  batch.set(itemRef, {
    accountId: uid,
    position: nextPosition,
    prompt: input.configuration.question,
    configuration: input.configuration,
    points: input.points,
  });
  batch.update(doc(db, "activities", activityId), {
    itemCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function updateMultipleChoiceItem(
  activityId: string,
  itemId: string,
  input: MultipleChoiceItemInput,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, "activities", activityId, "items", itemId), {
    prompt: input.configuration.question,
    configuration: input.configuration,
    points: input.points,
  });
}

/** Remove um item e decrementa `itemCount` na mesma escrita. */
export async function deleteActivityItem(
  activityId: string,
  itemId: string,
): Promise<void> {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  batch.delete(doc(db, "activities", activityId, "items", itemId));
  batch.update(doc(db, "activities", activityId), {
    itemCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

/** Troca a posição de dois itens (mover para cima/baixo — sem drag-and-drop, ver plano §8.3). */
export async function swapActivityItemPositions(
  activityId: string,
  a: ActivityItem,
  b: ActivityItem,
): Promise<void> {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  batch.update(doc(db, "activities", activityId, "items", a.id), {
    position: b.position,
  });
  batch.update(doc(db, "activities", activityId, "items", b.id), {
    position: a.position,
  });
  await batch.commit();
}
