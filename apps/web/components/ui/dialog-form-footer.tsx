import { Button } from "@/components/ui/button";

/** Rodapé comum aos formulários de diálogo: erro + Cancelar/Salvar. */
export function DialogFormFooter({
  error,
  busy,
  onCancel,
}: {
  error: string | null;
  busy: boolean;
  onCancel: () => void;
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
          {busy ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </>
  );
}
