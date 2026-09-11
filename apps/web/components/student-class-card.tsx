import type { MyClassSummary } from "@/lib/classes";

const STATUS_LABEL: Record<MyClassSummary["status"], string> = {
  ACTIVE: "Ativa",
  INACTIVE: "Inativa",
  ARCHIVED: "Arquivada",
};

export function StudentClassCard({ klass }: { klass: MyClassSummary }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">{klass.name}</h2>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {STATUS_LABEL[klass.status]}
        </span>
      </div>
      {klass.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {klass.description}
        </p>
      )}
    </div>
  );
}
