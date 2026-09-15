"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ACTIVITY_TYPE_LABEL, type ActivityType } from "@/lib/activities";
import {
  watchAssignment,
  type AssignmentContentEntry,
  type AssignmentSummary,
} from "@/lib/assignments";
import {
  createAttempt,
  createAttemptErrorMessage,
  fetchAttemptAnswers,
  fetchAttemptResult,
  fetchMyAttempt,
  saveAnswer,
  submitAttempt,
  submitAttemptErrorMessage,
  watchAttempt,
  type Attempt,
  type AttemptResult,
  type SubmitAttemptResult,
} from "@/lib/attempts";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/require-role";
import {
  MultipleChoiceAnswerable,
  type MultipleChoiceAnswer,
} from "@/components/multiple-choice-answerable";
import { Button } from "@/components/ui/button";

/** Tipos que o aluno já consegue resolver — cresce um de cada vez (PRs 4.4-4.6). */
const RESOLVABLE_TYPES: ActivityType[] = ["MULTIPLE_CHOICE"];

/** Debounce de "salvar progresso" (RF-013, decisão do plano — ~800ms). */
const SAVE_DEBOUNCE_MS = 800;

export default function ResolveAssignmentPage() {
  return (
    <RequireRole role="student">
      <ResolveAssignment />
    </RequireRole>
  );
}

function ResolveAssignment() {
  const params = useParams<{ classId: string; assignmentId: string }>();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentSummary | null>(null);
  const [assignmentLoaded, setAssignmentLoaded] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [answersRestored, setAnswersRestored] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitAttemptResult | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(
    () =>
      watchAssignment(params.classId, params.assignmentId, (a) => {
        setAssignment(a);
        setAssignmentLoaded(true);
      }),
    [params.classId, params.assignmentId],
  );

  // recupera a tentativa já existente (inclusive GRADED, ao revisitar
  // depois de enviar) ou cria uma nova (UC-006 passo 3) assim que a
  // atividade carrega — nessa ordem, para não chamar `createAttempt` de
  // novo numa tentativa já enviada (RN-007 rejeitaria: tentativas esgotadas).
  useEffect(() => {
    if (!assignment || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = await fetchMyAttempt(params.assignmentId, user.uid);
        if (existing) {
          if (!cancelled) setAttemptId(existing.id);
          return;
        }
        const res = await createAttempt(params.classId, params.assignmentId);
        if (!cancelled) setAttemptId(res.attemptId);
      } catch (err) {
        if (!cancelled) setStartError(createAttemptErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignment, user, params.classId, params.assignmentId]);

  useEffect(() => {
    if (!attemptId) return;
    return watchAttempt(attemptId, setAttempt);
  }, [attemptId]);

  // restaura respostas já salvas ao retomar uma tentativa (uma vez só —
  // depois disso o estado local do formulário é a fonte da verdade)
  useEffect(() => {
    if (!attemptId || answersRestored) return;
    let cancelled = false;
    fetchAttemptAnswers(attemptId).then((saved) => {
      if (!cancelled) {
        setAnswers(saved);
        setAnswersRestored(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [attemptId, answersRestored]);

  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  function handleAnswerChange(itemId: string, answer: unknown) {
    setAnswers((prev) => ({ ...prev, [itemId]: answer }));
    if (!attemptId) return;
    clearTimeout(saveTimers.current[itemId]);
    saveTimers.current[itemId] = setTimeout(() => {
      void saveAnswer(attemptId, itemId, answer);
    }, SAVE_DEBOUNCE_MS);
  }

  async function handleSubmit() {
    if (!attemptId) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await submitAttempt(attemptId, answers);
      setResult(res);
    } catch (err) {
      setSubmitError(submitAttemptErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!assignmentLoaded) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  if (!assignment) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          Atividade não encontrada.{" "}
          <Link href={`/salas/${params.classId}`} className="underline">
            Voltar para a sala
          </Link>
          .
        </p>
      </div>
    );
  }

  // `attempt` só é carregado depois de `attemptId` existir, então
  // `graded` nunca é true sem `attemptId` já definido.
  const graded =
    !!attemptId &&
    (result?.status === "GRADED" || attempt?.status === "GRADED");

  return (
    <div>
      <Link
        href={`/salas/${params.classId}`}
        className="text-sm text-muted-foreground underline"
      >
        ← Voltar para a sala
      </Link>

      <h1 className="mt-2 text-2xl font-bold">{assignment.activityTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {ACTIVITY_TYPE_LABEL[assignment.type]}
      </p>

      {startError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {startError}
        </p>
      )}

      {graded ? (
        <GradedConfirmation attemptId={attemptId!} freshResult={result} />
      ) : (
        !startError &&
        attemptId && (
          <div className="mt-6">
            <ResolveContent
              type={assignment.type}
              items={assignment.contentSnapshot}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              disabled={submitting}
            />

            {RESOLVABLE_TYPES.includes(assignment.type) && (
              <div className="mt-6">
                {submitError && (
                  <p role="alert" className="mb-2 text-sm text-red-600">
                    {submitError}
                  </p>
                )}
                <Button disabled={submitting} onClick={handleSubmit}>
                  {submitting ? "Enviando…" : "Enviar"}
                </Button>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

/**
 * Confirmação pós-envio (RF-017): usa a nota já devolvida por
 * `submitAttempt` quando ela veio junto (liberação já ativa naquele
 * instante); senão busca `attemptResults` uma vez (revisita a tela
 * depois de enviar, ou a liberação aconteceu depois — nesse caso só
 * aparece com um refresh, não é ao vivo nesta fase).
 */
function GradedConfirmation({
  attemptId,
  freshResult,
}: {
  attemptId: string;
  freshResult: SubmitAttemptResult | null;
}) {
  const [fetched, setFetched] = useState<AttemptResult | null>(null);

  useEffect(() => {
    if (freshResult?.resultsReleased) return;
    let cancelled = false;
    fetchAttemptResult(attemptId).then((r) => {
      if (!cancelled) setFetched(r);
    });
    return () => {
      cancelled = true;
    };
  }, [attemptId, freshResult]);

  const released = freshResult?.resultsReleased || fetched !== null;
  const score = freshResult?.resultsReleased
    ? freshResult.score
    : fetched?.score;
  const maxScore = freshResult?.resultsReleased
    ? freshResult.maxScore
    : fetched?.maxScore;

  return (
    <div className="mt-6 rounded-lg border border-border p-4">
      <p role="status" className="font-medium">
        Tentativa enviada.
      </p>
      {released ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Nota: {score} / {maxScore}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          Aguardando liberação do resultado pelo professor.
        </p>
      )}
    </div>
  );
}

function ResolveContent({
  type,
  items,
  answers,
  onAnswerChange,
  disabled,
}: {
  type: ActivityType;
  items: AssignmentContentEntry[];
  answers: Record<string, unknown>;
  onAnswerChange: (itemId: string, answer: unknown) => void;
  disabled: boolean;
}) {
  if (type === "MULTIPLE_CHOICE") {
    return (
      <MultipleChoiceAnswerable
        items={
          items as AssignmentContentEntry<{
            question: string;
            options: string[];
          }>[]
        }
        answers={answers as Record<string, MultipleChoiceAnswer | undefined>}
        onAnswerChange={
          onAnswerChange as (
            itemId: string,
            answer: MultipleChoiceAnswer,
          ) => void
        }
        disabled={disabled}
      />
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Resolver este tipo de atividade ainda não está disponível.
    </p>
  );
}
