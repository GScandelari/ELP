/** Campos de nome/descrição da sala, reaproveitados por criar e editar. */
export function ClassNameDescriptionFields({
  idPrefix,
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: {
  idPrefix: string;
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}) {
  return (
    <>
      <div>
        <label
          htmlFor={`${idPrefix}-name`}
          className="block text-sm font-medium"
        >
          Nome
        </label>
        <input
          id={`${idPrefix}-name`}
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
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
    </>
  );
}
