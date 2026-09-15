import Link from "next/link";
import { ACTIVITY_TYPE_LABEL, type ActivitySummary } from "@/lib/activities";

const STATUS_LABEL: Record<ActivitySummary["status"], string> = {
  DRAFT: "Rascunho",
  READY: "Pronta",
  LOCKED: "Travada",
  ARCHIVED: "Arquivada",
};

export function ActivityCard({ activity }: { activity: ActivitySummary }) {
  return (
    <Link
      href={`/atividades/${activity.id}`}
      className="block rounded-lg border border-border p-4 transition-colors hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">{activity.title}</h2>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {STATUS_LABEL[activity.status]}
        </span>
      </div>
      {activity.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {activity.description}
        </p>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        {ACTIVITY_TYPE_LABEL[activity.type]} · {activity.itemCount}{" "}
        {activity.itemCount === 1 ? "item" : "itens"}
      </p>
      {activity.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {activity.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
