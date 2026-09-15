/** Campo "Pontos" compartilhado pelos diálogos de item de atividade. */
export function PointsField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        Pontos
      </label>
      <input
        id={id}
        type="number"
        min={1}
        required
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 1)}
        className="mt-1 h-10 w-24 rounded-md border border-border bg-background px-3 text-sm"
      />
    </div>
  );
}
