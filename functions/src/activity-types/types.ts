/**
 * Contrato comum de um tipo de atividade (Activity Engine, SDD seção 8).
 *
 * Cada tipo (Multiple Choice, Fill in the Blanks, Translation, Meaning
 * Matching — RF-009) implementa esta interface em
 * `functions/src/activity-types/{type}.ts` e se registra no mapa de
 * `functions/src/activity-types/index.ts` (a partir da PR 3.3).
 *
 * `publishAssignment`/`swapAssignmentActivity` chamam `validate` +
 * `toStudentContent` + `toGradingConfig` ao congelar um assignment
 * (ADR-012). `score` só é chamado a partir da Fase 4 (`submitAttempt`),
 * mas já é implementado agora — função pura, testável isoladamente sem
 * depender de nada da Fase 4 existir.
 *
 * @template TConfig  formato de `items/{itemId}.configuration` no
 *   repositório (autoria — inclui o gabarito).
 * @template TStudent formato que vai para `contentSnapshot` do assignment
 *   (visível ao aluno, sem gabarito).
 * @template TGrading formato que vai para `assignmentKeys.gradingConfig`
 *   (gabarito congelado, nunca legível pelo client).
 * @template TAnswer  formato da resposta que o aluno envia (Fase 4).
 */
export interface ActivityTypeHandler<TConfig, TStudent, TGrading, TAnswer> {
  /**
   * Valida a configuração de um item (RN-006). Lança `HttpsError`
   * (`invalid-argument`) quando inválida — nunca falha silenciosamente.
   * Chamado antes de congelar o snapshot, nunca depois.
   */
  validate(config: TConfig): void;

  /** Remove o gabarito — vira um item do `contentSnapshot` (ADR-012). */
  toStudentContent(config: TConfig): TStudent;

  /** Extrai a parte que vai para `assignmentKeys.gradingConfig` (gabarito congelado). */
  toGradingConfig(config: TConfig): TGrading;

  /**
   * Corrige uma resposta do aluno contra o gabarito congelado (RN-008).
   * `maxPoints` vem de `items.points` no momento da atribuição — mantido
   * fora de `TGrading` porque é o mesmo conceito em todos os tipos, não
   * faz parte do gabarito específico do tipo.
   */
  score(
    answer: TAnswer,
    gradingConfig: TGrading,
    maxPoints: number,
  ): { isCorrect: boolean; pointsAwarded: number };
}

/** Tipos de atividade do MVP (RF-009), em ordem de implementação (Fase 3). */
export type ActivityType =
  "MULTIPLE_CHOICE" | "FILL_IN_BLANKS" | "TRANSLATION" | "MEANING_MATCHING";
