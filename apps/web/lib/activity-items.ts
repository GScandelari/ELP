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
 * CRUD de itens genérico — o formato de `configuration` é por tipo (ver
 * `lib/multiple-choice.ts`, `lib/fill-in-blanks.ts`, ...), essas operações
 * (observar, criar, editar, remover, reordenar) não precisam saber qual.
 */
export type ActivityItem<TConfig = unknown> = {
  id: string;
  position: number;
  points: number;
  configuration: TConfig;
};

function mapItem<TConfig>(
  id: string,
  data: DocumentData | undefined,
): ActivityItem<TConfig> | null {
  if (!data) return null;
  return {
    id,
    position: data.position ?? 0,
    points: data.points ?? 1,
    configuration: (data.configuration ?? {}) as TConfig,
  };
}

/** Observa os itens de uma atividade, em ordem. */
export function watchActivityItems<TConfig = unknown>(
  activityId: string,
  uid: string,
  onChange: (items: ActivityItem<TConfig>[]) => void,
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
          .map((d) => mapItem<TConfig>(d.id, d.data()))
          .filter((i): i is ActivityItem<TConfig> => i !== null),
      );
    },
    () => onChange([]),
  );
}

export type ActivityItemInput<TConfig> = {
  configuration: TConfig;
  points: number;
  /** Resumo curto do item (ex.: o enunciado) — cada tipo calcula o próprio. */
  prompt: string;
};

/**
 * Cria um item e incrementa `activities/{id}.itemCount` na mesma escrita
 * (writeBatch — o client SDK também tem lote atômico, não é só o Admin
 * SDK). A rule de `items.create` já exige dono + não travada.
 */
export async function addActivityItem<TConfig>(
  activityId: string,
  uid: string,
  nextPosition: number,
  input: ActivityItemInput<TConfig>,
): Promise<void> {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  const itemRef = doc(collection(db, "activities", activityId, "items"));
  batch.set(itemRef, {
    accountId: uid,
    position: nextPosition,
    prompt: input.prompt,
    configuration: input.configuration,
    points: input.points,
  });
  batch.update(doc(db, "activities", activityId), {
    itemCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function updateActivityItem<TConfig>(
  activityId: string,
  itemId: string,
  input: ActivityItemInput<TConfig>,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, "activities", activityId, "items", itemId), {
    prompt: input.prompt,
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
export async function swapActivityItemPositions<TConfig>(
  activityId: string,
  a: ActivityItem<TConfig>,
  b: ActivityItem<TConfig>,
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
