import {
  FieldValue,
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { requireRole } from "../lib/require-role";

type Payload = {
  activityId?: unknown;
};

const VERSION_SUFFIX_RE = /^(.*) \(v(\d+)\)$/;

function baseTitleOf(title: string): string {
  const match = VERSION_SUFFIX_RE.exec(title);
  return match ? match[1]! : title;
}

/**
 * Calcula "{título base} (vN)" — N é o maior já usado entre as atividades
 * do professor com o mesmo título base, mais um (ADR-014 §7: "incrementa
 * se já existir").
 */
async function computeCloneTitle(
  db: Firestore,
  uid: string,
  sourceTitle: string,
): Promise<string> {
  const base = baseTitleOf(sourceTitle);
  const snap = await db
    .collection("activities")
    .where("accountId", "==", uid)
    .get();

  let maxVersion = 1;
  for (const doc of snap.docs) {
    const title = doc.get("title") as string;
    if (title === base) continue; // é a v1 implícita, já contabilizada
    const match = VERSION_SUFFIX_RE.exec(title);
    if (match && match[1] === base) {
      maxVersion = Math.max(maxVersion, Number(match[2]));
    }
  }
  return `${base} (v${maxVersion + 1})`;
}

/**
 * Duplica uma atividade + todos os itens (RF-022, ADR-014 §3/§7).
 * Disponível em qualquer atividade, travada ou não — também serve para
 * "criar uma parecida com esta". A cópia nasce `DRAFT`, `locked: false`,
 * sem nenhum vínculo com salas/tentativas do original.
 */
export const cloneActivity = onCall(
  { enforceAppCheck: true },
  async (request) => {
    const uid = requireRole(
      request,
      "teacher",
      "Apenas professores podem clonar atividades.",
    );

    const data = (request.data ?? {}) as Payload;
    const activityId =
      typeof data.activityId === "string" ? data.activityId : "";
    if (!activityId) {
      throw new HttpsError("invalid-argument", "Atividade inválida.");
    }

    const db = getFirestore();

    const activityRef = db.doc(`activities/${activityId}`);
    const activitySnap = await activityRef.get();
    if (!activitySnap.exists) {
      throw new HttpsError("not-found", "Atividade não encontrada.");
    }
    if (activitySnap.get("accountId") !== uid) {
      throw new HttpsError("permission-denied", "Esta atividade não é sua.");
    }

    const itemsSnap = await activityRef
      .collection("items")
      .orderBy("position", "asc")
      .get();

    const title = await computeCloneTitle(
      db,
      uid,
      activitySnap.get("title") ?? "",
    );

    const now = FieldValue.serverTimestamp();
    const newActivityRef = db.collection("activities").doc();

    const batch = db.batch();
    batch.set(newActivityRef, {
      accountId: uid,
      title,
      description: activitySnap.get("description") ?? "",
      type: activitySnap.get("type"),
      difficulty: activitySnap.get("difficulty") ?? "EASY",
      tags: activitySnap.get("tags") ?? [],
      status: "DRAFT",
      locked: false,
      lockedAt: null,
      clonedFrom: activityId,
      itemCount: itemsSnap.size,
      createdAt: now,
      updatedAt: now,
    });
    for (const itemDoc of itemsSnap.docs) {
      const itemData = itemDoc.data();
      batch.set(newActivityRef.collection("items").doc(), {
        accountId: uid,
        position: itemData.position ?? 0,
        prompt: itemData.prompt ?? "",
        configuration: itemData.configuration ?? {},
        points: itemData.points ?? 1,
      });
    }
    await batch.commit();

    return { activityId: newActivityRef.id };
  },
);
