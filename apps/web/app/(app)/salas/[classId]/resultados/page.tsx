"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  watchClass,
  watchRoster,
  type ClassSummary,
  type RosterEntry,
} from "@/lib/classes";
import {
  watchClassAssignments,
  type AssignmentSummary,
} from "@/lib/assignments";
import { watchResultsSummary, type ResultsSummaryEntry } from "@/lib/results";
import { RequireRole } from "@/components/require-role";
import { ResultsTable } from "@/components/results-table";

export default function ResultsPage() {
  return (
    <RequireRole role="teacher">
      <ClassResults />
    </RequireRole>
  );
}

/** Dashboard de resultados do professor (RF-018/UC-007, Fase 5). */
function ClassResults() {
  const params = useParams<{ classId: string }>();
  const { user } = useAuth();
  const [klass, setKlass] = useState<ClassSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [results, setResults] = useState<ResultsSummaryEntry[]>([]);

  useEffect(
    () =>
      watchClass(params.classId, (c) => {
        setKlass(c);
        setLoaded(true);
      }),
    [params.classId],
  );

  useEffect(() => {
    if (!user) return;
    return watchRoster(params.classId, user.uid, setRoster);
  }, [params.classId, user]);

  useEffect(() => {
    if (!user) return;
    return watchClassAssignments(params.classId, user.uid, setAssignments);
  }, [params.classId, user]);

  useEffect(() => {
    if (!user) return;
    return watchResultsSummary(params.classId, user.uid, setResults);
  }, [params.classId, user]);

  if (!loaded) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  if (!klass) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          Sala não encontrada.{" "}
          <Link href="/salas" className="underline">
            Voltar para Minhas salas
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/salas/${params.classId}`}
        className="text-sm text-muted-foreground underline"
      >
        ← Voltar para a sala
      </Link>

      <h1 className="mt-2 text-2xl font-bold">Resultados — {klass.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Notas de cada aluno por atividade, independente de liberação (RN-010).
      </p>

      <div className="mt-6">
        <ResultsTable
          roster={roster}
          assignments={assignments}
          results={results}
        />
      </div>
    </div>
  );
}
