"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { watchTeacherClasses, type ClassSummary } from "@/lib/classes";
import { Button } from "@/components/ui/button";
import { ClassCard } from "@/components/class-card";
import { CreateClassDialog } from "@/components/create-class-dialog";

export default function SalasPage() {
  const { user, role, loading } = useAuth();

  if (loading || !user) return null;
  if (role === "teacher") return <TeacherClasses uid={user.uid} />;
  if (role === "student") return <StudentClassesPlaceholder />;
  return null;
}

function TeacherClasses({ uid }: { uid: string }) {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassSummary[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => watchTeacherClasses(uid, setClasses), [uid]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Minhas salas</h1>
        <Button onClick={() => setDialogOpen(true)}>Criar sala</Button>
      </div>

      {classes === null && (
        <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>
      )}
      {classes?.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          Você ainda não criou nenhuma sala.
        </p>
      )}
      {classes && classes.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((klass) => (
            <ClassCard key={klass.id} klass={klass} />
          ))}
        </div>
      )}

      <CreateClassDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(classId) => {
          setDialogOpen(false);
          router.push(`/salas/${classId}`);
        }}
      />
    </div>
  );
}

// Fase 2.4 substitui por: entrar em sala por código + lista das salas do aluno.
function StudentClassesPlaceholder() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Minhas salas</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Em breve você poderá entrar em uma sala usando o código do professor.
      </p>
    </div>
  );
}
