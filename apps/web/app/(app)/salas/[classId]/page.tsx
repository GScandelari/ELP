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
import { RequireRole } from "@/components/require-role";
import { EnrollmentCodeBadge } from "@/components/enrollment-code-badge";
import { AddStudentDialog } from "@/components/add-student-dialog";
import { StudentRoster } from "@/components/student-roster";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<ClassSummary["status"], string> = {
  ACTIVE: "Ativa",
  INACTIVE: "Inativa",
  ARCHIVED: "Arquivada",
};

export default function ClassDetailPage() {
  return (
    <RequireRole role="teacher">
      <ClassDetail />
    </RequireRole>
  );
}

function ClassDetail() {
  const params = useParams<{ classId: string }>();
  const { user } = useAuth();
  const [klass, setKlass] = useState<ClassSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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

  if (!loaded) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  if (!klass) {
    // Sala inexistente ou de outro professor (a regra já bloqueou a leitura).
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
      <Link href="/salas" className="text-sm text-muted-foreground underline">
        ← Minhas salas
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{klass.name}</h1>
          {klass.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {klass.description}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {STATUS_LABEL[klass.status]}
        </span>
      </div>

      <div className="mt-6 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Código de inscrição
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Compartilhe com os alunos para que entrem na sala por conta própria.
        </p>
        <div className="mt-3">
          <EnrollmentCodeBadge code={klass.enrollmentCode} />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Alunos inscritos ({klass.studentCount})
          </h2>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            Adicionar aluno
          </Button>
        </div>
        <StudentRoster classId={params.classId} roster={roster} />
      </div>

      <AddStudentDialog
        classId={params.classId}
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
      />
    </div>
  );
}
