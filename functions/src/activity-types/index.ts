import { HttpsError } from "firebase-functions/v2/https";
import type { ActivityType, ActivityTypeHandler } from "./types";
import { multipleChoiceHandler } from "./multiple-choice";
import { fillInBlanksHandler } from "./fill-in-blanks";
import { translationHandler } from "./translation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = ActivityTypeHandler<any, any, any, any>;

/** Registro tipo -> handler (Activity Engine, SDD seção 8). */
const registry: Partial<Record<ActivityType, AnyHandler>> = {
  MULTIPLE_CHOICE: multipleChoiceHandler,
  FILL_IN_BLANKS: fillInBlanksHandler,
  TRANSLATION: translationHandler,
  // MEANING_MATCHING chega na próxima PR da Fase 3
};

/** Lança `failed-precondition` para um tipo ainda sem handler registrado. */
export function getActivityTypeHandler(type: ActivityType): AnyHandler {
  const handler = registry[type];
  if (!handler) {
    throw new HttpsError(
      "failed-precondition",
      `O tipo de atividade "${type}" ainda não está disponível.`,
    );
  }
  return handler;
}
