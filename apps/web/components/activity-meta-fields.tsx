import type { ActivityDifficulty } from "@/lib/activities";

export const DIFFICULTY_LABEL: Record<ActivityDifficulty, string> = {
  EASY: "Fácil",
  MEDIUM: "Médio",
  HARD: "Difícil",
};

/** Título, descrição, dificuldade e tags — reaproveitado por criar e editar. */
export function ActivityMetaFields({
  idPrefix,
  title,
  description,
  difficulty,
  tagsInput,
  onTitleChange,
  onDescriptionChange,
  onDifficultyChange,
  onTagsInputChange,
}: {
  idPrefix: string;
  title: string;
  description: string;
  difficulty: ActivityDifficulty;
  tagsInput: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDifficultyChange: (value: ActivityDifficulty) => void;
  onTagsInputChange: (value: string) => void;
}) {
  return (
    <>
      <div>
        <label
          htmlFor={`${idPrefix}-title`}
          className="block text-sm font-medium"
        >
          Título
        </label>
        <input
          id={`${idPrefix}-title`}
          required
          minLength={2}
          maxLength={120}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-description`}
          className="block text-sm font-medium"
        >
          Descrição (opcional)
        </label>
        <textarea
          id={`${idPrefix}-description`}
          maxLength={500}
          rows={3}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-difficulty`}
          className="block text-sm font-medium"
        >
          Dificuldade
        </label>
        <select
          id={`${idPrefix}-difficulty`}
          value={difficulty}
          onChange={(e) =>
            onDifficultyChange(e.target.value as ActivityDifficulty)
          }
          className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          {Object.entries(DIFFICULTY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-tags`}
          className="block text-sm font-medium"
        >
          Tags (opcional, separadas por vírgula)
        </label>
        <input
          id={`${idPrefix}-tags`}
          value={tagsInput}
          onChange={(e) => onTagsInputChange(e.target.value)}
          placeholder="gramática, presente simples"
          className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        />
      </div>
    </>
  );
}
