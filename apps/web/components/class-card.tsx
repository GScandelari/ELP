import Link from "next/link";
import type { ClassSummary } from "@/lib/classes";
import { formatCode } from "@/lib/enrollment-code";

const STATUS_LABEL: Record<ClassSummary["status"], string> = {
  ACTIVE: "Ativa",
  INACTIVE: "Inativa",
  ARCHIVED: "Arquivada",
};

export function ClassCard({ klass }: { klass: ClassSummary }) {
  return (
    <Link
      href={`/salas/${klass.id}`}
      className="block rounded-lg border border-border p-4 transition-colors hover:bg-muted"
    >
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
      <dl className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <div>
          <dt className="inline">Código: </dt>
          <dd className="inline font-mono">
            {formatCode(klass.enrollmentCode)}
          </dd>
        </div>
        <div>
          <dt className="inline">Alunos: </dt>
          <dd className="inline">{klass.studentCount}</dd>
        </div>
      </dl>
    </Link>
  );
}
