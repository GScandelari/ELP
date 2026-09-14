"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  setActivityStatus,
  watchActivity,
  type ActivitySummary,
} from "@/lib/activities";
import { RequireRole } from "@/components/require-role";
import { EditActivityDialog } from "@/components/edit-activity-dialog";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<ActivitySummary["status"], string> = {
  DRAFT: "Rascunho",
  READY: "Pronta",
  LOCKED: "Travada",
  ARCHIVED: "Arquivada",
};

const TYPE_LABEL: Record<ActivitySummary["type"], string> = {
  MULTIPLE_CHOICE: "Múltipla escolha",
  FILL_IN_BLANKS: "Preencher espaços",
  TRANSLATION: "Tradução/localização",
  MEANING_MATCHING: "Relacionamento de significados",
};

export default function ActivityDetailPage() {
  return (
    <RequireRole role="teacher">
      <ActivityDetail />
    </RequireRole>
  );
}

function ActivityDetail() {
  const params = useParams<{ activityId: string }>();
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(
    () =>
      watchActivity(params.activityId, (a) => {
        setActivity(a);
        setLoaded(true);
      }),
    [params.activityId],
  );

  if (!loaded) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  if (!activity) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          Atividade não encontrada.{" "}
          <Link href="/atividades" className="underline">
            Voltar para Minhas atividades
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/atividades"
        className="text-sm text-muted-foreground underline"
      >
        ← Minhas atividades
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{activity.title}</h1>
          {activity.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {activity.description}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {TYPE_LABEL[activity.type]}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {STATUS_LABEL[activity.status]}
        </span>
      </div>

      {activity.locked ? (
        <p
          role="status"
          className="mt-3 rounded-md border border-border bg-muted p-3 text-sm"
        >
          Esta atividade já foi iniciada por um aluno e não pode mais ser
          editada. Para corrigir, clone-a — essa ação chega numa próxima PR da
          Fase 3.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            Editar
          </Button>
          <StatusActions activityId={params.activityId} activity={activity} />
        </div>
      )}

      <div className="mt-6 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Itens ({activity.itemCount})
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O construtor de itens para {TYPE_LABEL[activity.type].toLowerCase()}{" "}
          chega numa próxima PR da Fase 3.
        </p>
      </div>

      <EditActivityDialog
        activityId={params.activityId}
        activity={activity}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}

function StatusActions({
  activityId,
  activity,
}: {
  activityId: string;
  activity: ActivitySummary;
}) {
  const [busy, setBusy] = useState(false);

  async function go(status: "DRAFT" | "READY" | "ARCHIVED") {
    setBusy(true);
    try {
      await setActivityStatus(activityId, status);
    } finally {
      setBusy(false);
    }
  }

  if (activity.status === "DRAFT") {
    const canPublish = activity.itemCount > 0;
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || !canPublish}
          title={canPublish ? undefined : "Adicione pelo menos um item antes"}
          onClick={() => go("READY")}
        >
          Marcar como pronta
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => go("ARCHIVED")}
        >
          Arquivar
        </Button>
      </>
    );
  }

  if (activity.status === "READY") {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => go("DRAFT")}
        >
          Voltar para rascunho
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => go("ARCHIVED")}
        >
          Arquivar
        </Button>
      </>
    );
  }

  if (activity.status === "ARCHIVED") {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => go("DRAFT")}
      >
        Reativar como rascunho
      </Button>
    );
  }

  return null;
}
