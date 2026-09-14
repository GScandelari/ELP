"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { watchTeacherActivities, type ActivitySummary } from "@/lib/activities";
import { Button } from "@/components/ui/button";
import { ActivityCard } from "@/components/activity-card";
import { CreateActivityDialog } from "@/components/create-activity-dialog";
import { RequireRole } from "@/components/require-role";

export default function AtividadesPage() {
  return (
    <RequireRole role="teacher">
      <TeacherActivities />
    </RequireRole>
  );
}

function TeacherActivities() {
  const { user } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivitySummary[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchTeacherActivities(user.uid, setActivities);
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Minhas atividades</h1>
        <Button onClick={() => setDialogOpen(true)}>Nova atividade</Button>
      </div>

      {activities === null && (
        <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>
      )}
      {activities?.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          Você ainda não criou nenhuma atividade.
        </p>
      )}
      {activities && activities.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}

      <CreateActivityDialog
        uid={user.uid}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(activityId) => {
          setDialogOpen(false);
          router.push(`/atividades/${activityId}`);
        }}
      />
    </div>
  );
}
