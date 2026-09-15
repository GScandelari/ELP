import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { ActivityTypeHandler } from "../activity-types/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = ActivityTypeHandler<any, any, any, any>;

/**
 * Congela `contentSnapshot` (sem gabarito) e `gradingConfig` (gabarito) a
 * partir dos itens de uma atividade — chamando `validate` (RN-006) +
 * `toStudentContent` + `toGradingConfig` do handler na MESMA passada por
 * item, nunca em passos separados (docs/plano-fase-3.md §10 — evita os
 * dois divergirem entre si). Compartilhado por `publishAssignment` e
 * `swapAssignmentActivity`, que fazem exatamente essa operação a partir
 * de origens diferentes (a atividade sendo publicada vs. a atividade de
 * origem de uma troca).
 */
export function freezeContent(
  handler: AnyHandler,
  itemDocs: QueryDocumentSnapshot[],
): { contentSnapshot: unknown[]; gradingConfig: unknown[] } {
  const contentSnapshot: unknown[] = [];
  const gradingConfig: unknown[] = [];
  for (const itemDoc of itemDocs) {
    const config = itemDoc.data().configuration;
    handler.validate(config); // RN-006 — autoritativo, aqui e não no client
    const points = itemDoc.data().points ?? 1;
    contentSnapshot.push({
      itemId: itemDoc.id,
      prompt: itemDoc.data().prompt ?? "",
      points,
      content: handler.toStudentContent(config),
    });
    gradingConfig.push({
      itemId: itemDoc.id,
      points,
      grading: handler.toGradingConfig(config),
    });
  }
  return { contentSnapshot, gradingConfig };
}
