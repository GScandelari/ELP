import { Button } from "@/components/ui/button";

/** Rodapé comum aos formulários de diálogo: erro + Cancelar/Salvar. */
export function DialogFormFooter({
  error,
  busy,
  onCancel,
  submitLabel = "Salvar",
  busyLabel = "Salvando…",
}: {
  error: string | null;
  busy: boolean;
  onCancel: () => void;
  /** Personaliza o texto do botão principal (ex.: "Atribuir"/"Atribuindo…"). */
  submitLabel?: string;
  busyLabel?: string;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={busy}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? busyLabel : submitLabel}
        </Button>
      </div>
    </>
  );
}
