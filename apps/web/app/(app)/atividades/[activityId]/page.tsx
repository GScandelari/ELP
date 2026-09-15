"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { Unsubscribe } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import {
  setActivityStatus,
  watchActivity,
  type ActivitySummary,
} from "@/lib/activities";
import type { ActivityItem } from "@/lib/activity-items";
import { watchMultipleChoiceItems } from "@/lib/multiple-choice";
import { watchFillInBlanksItems } from "@/lib/fill-in-blanks";
import { watchTranslationItems } from "@/lib/translation";
import { watchMeaningMatchingItems } from "@/lib/meaning-matching";
import { shuffled } from "@/lib/shuffle";
import { RequireRole } from "@/components/require-role";
import { EditActivityDialog } from "@/components/edit-activity-dialog";
import { PublishAssignmentDialog } from "@/components/publish-assignment-dialog";
import { MultipleChoiceBuilder } from "@/components/multiple-choice-builder";
import { MultipleChoiceRenderer } from "@/components/multiple-choice-renderer";
import { FillInBlanksBuilder } from "@/components/fill-in-blanks-builder";
import { FillInBlanksRenderer } from "@/components/fill-in-blanks-renderer";
import { TranslationBuilder } from "@/components/translation-builder";
import { TranslationRenderer } from "@/components/translation-renderer";
import { MeaningMatchingBuilder } from "@/components/meaning-matching-builder";
import { MeaningMatchingRenderer } from "@/components/meaning-matching-renderer";
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

/** Builder de cada tipo já disponível — todos têm o mesmo formato de props. */
const BUILDERS: Partial<
  Record<
    ActivitySummary["type"],
    (props: {
      activityId: string;
      uid: string;
      readOnly?: boolean;
    }) => ReactNode
  >
> = {
  MULTIPLE_CHOICE: MultipleChoiceBuilder,
  FILL_IN_BLANKS: FillInBlanksBuilder,
  TRANSLATION: TranslationBuilder,
  MEANING_MATCHING: MeaningMatchingBuilder,
};

type PreviewableType =
  "MULTIPLE_CHOICE" | "FILL_IN_BLANKS" | "TRANSLATION" | "MEANING_MATCHING";

function isPreviewableType(
  type: ActivitySummary["type"],
): type is PreviewableType {
  return (
    type === "MULTIPLE_CHOICE" ||
    type === "FILL_IN_BLANKS" ||
    type === "TRANSLATION" ||
    type === "MEANING_MATCHING"
  );
}

export default function ActivityDetailPage() {
  return (
    <RequireRole role="teacher">
      <ActivityDetail />
    </RequireRole>
  );
}

function ActivityDetail() {
  const params = useParams<{ activityId: string }>();
  const { user } = useAuth();
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  useEffect(
    () =>
      watchActivity(params.activityId, (a) => {
        setActivity(a);
        setLoaded(true);
      }),
    [params.activityId],
  );

  if (!user || !loaded) {
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

  const Builder = BUILDERS[activity.type];

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
          {activity.status === "READY" && (
            <Button size="sm" onClick={() => setPublishOpen(true)}>
              Atribuir a sala(s)
            </Button>
          )}
        </div>
      )}

      <div className="mt-6 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Itens ({activity.itemCount})
        </h2>
        <div className="mt-2">
          {Builder ? (
            <Builder
              activityId={params.activityId}
              uid={user.uid}
              readOnly={activity.locked}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              O construtor de itens para{" "}
              {TYPE_LABEL[activity.type].toLowerCase()} chega numa próxima PR da
              Fase 3.
            </p>
          )}
        </div>
      </div>

      {isPreviewableType(activity.type) && (
        <ActivityPreview
          type={activity.type}
          activityId={params.activityId}
          uid={user.uid}
        />
      )}

      <EditActivityDialog
        activityId={params.activityId}
        activity={activity}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
      <PublishAssignmentDialog
        activityId={params.activityId}
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
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

/**
 * Mostra como o aluno veria a atividade (sem gabarito) — só leitura
 * nesta fase (docs/plano-fase-3.md §1.1). Observa os itens só enquanto
 * aberto, para não pagar leitura à toa quando ninguém pediu.
 */
function ActivityPreview({
  type,
  activityId,
  uid,
}: {
  type: PreviewableType;
  activityId: string;
  uid: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 rounded-lg border border-border p-4">
      <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
        {open ? "Ocultar" : "Mostrar"} pré-visualização do aluno
      </Button>
      {open && (
        <ActivityPreviewContent type={type} activityId={activityId} uid={uid} />
      )}
    </div>
  );
}

function ActivityPreviewContent({
  type,
  activityId,
  uid,
}: {
  type: PreviewableType;
  activityId: string;
  uid: string;
}) {
  if (type === "MULTIPLE_CHOICE") {
    return (
      <ItemPreview
        activityId={activityId}
        uid={uid}
        watchItems={watchMultipleChoiceItems}
        mapItem={(i) => ({
          question: i.configuration.question,
          options: i.configuration.options,
        })}
        Renderer={MultipleChoiceRenderer}
      />
    );
  }

  if (type === "FILL_IN_BLANKS") {
    return (
      <ItemPreview
        activityId={activityId}
        uid={uid}
        watchItems={watchFillInBlanksItems}
        mapItem={(i) => ({
          mode: i.configuration.mode,
          text: i.configuration.text,
          blankIds: i.configuration.blanks.map((b) => b.id),
          wordBank: i.configuration.wordBank,
        })}
        Renderer={FillInBlanksRenderer}
      />
    );
  }

  if (type === "TRANSLATION") {
    return (
      <ItemPreview
        activityId={activityId}
        uid={uid}
        watchItems={watchTranslationItems}
        mapItem={(i) => ({
          mode: i.configuration.mode,
          source: i.configuration.source,
          options: i.configuration.options,
        })}
        Renderer={TranslationRenderer}
      />
    );
  }

  return (
    <ItemPreview
      activityId={activityId}
      uid={uid}
      watchItems={watchMeaningMatchingItems}
      mapItem={(i) => ({
        leftItems: shuffled(
          i.configuration.pairs.map((p) => ({ id: p.id, left: p.left })),
        ),
        rightItems: shuffled(
          i.configuration.pairs.map((p) => ({ id: p.id, right: p.right })),
        ),
      })}
      Renderer={MeaningMatchingRenderer}
    />
  );
}

/** Observa os itens de um tipo e delega a exibição ao Renderer daquele tipo. */
function ItemPreview<TConfig, TView>({
  activityId,
  uid,
  watchItems,
  mapItem,
  Renderer,
}: {
  activityId: string;
  uid: string;
  watchItems: (
    activityId: string,
    uid: string,
    onChange: (items: ActivityItem<TConfig>[]) => void,
  ) => Unsubscribe;
  mapItem: (item: ActivityItem<TConfig>) => TView;
  Renderer: (props: { items: TView[] }) => ReactNode;
}) {
  const [items, setItems] = useState<ActivityItem<TConfig>[] | null>(null);

  useEffect(
    () => watchItems(activityId, uid, setItems),
    [activityId, uid, watchItems],
  );

  if (items === null) {
    return <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>;
  }
  return (
    <div className="mt-3">
      <Renderer items={items.map(mapItem)} />
    </div>
  );
}
