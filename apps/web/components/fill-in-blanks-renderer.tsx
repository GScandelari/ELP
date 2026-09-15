/**
 * Visualização como o aluno veria (sem gabarito) — só leitura nesta fase,
 * sem captura de resposta (ver docs/plano-fase-3.md §1.1). A versão
 * interativa entra na Fase 4 junto de createAttempt/submitAttempt.
 */
export function FillInBlanksRenderer({
  items,
}: {
  items: {
    mode: "TYPING" | "WORD_BANK";
    text: string;
    blankIds: string[];
    wordBank?: string[];
  }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>;
  }

  return (
    <ol className="space-y-4">
      {items.map((item, index) => (
        <li key={index}>
          <p>
            {index + 1}.{" "}
            {item.text.split(/(\{\{[^}]+\}\})/g).map((part, i) =>
              /^\{\{[^}]+\}\}$/.test(part) ? (
                item.mode === "WORD_BANK" ? (
                  <select
                    key={i}
                    disabled
                    className="mx-1 rounded border border-border px-1 text-sm"
                  >
                    <option>—</option>
                  </select>
                ) : (
                  <input
                    key={i}
                    disabled
                    className="mx-1 w-24 rounded border border-border px-1 text-sm"
                  />
                )
              ) : (
                <span key={i}>{part}</span>
              ),
            )}
          </p>
          {item.mode === "WORD_BANK" && item.wordBank && (
            <p className="mt-1 text-xs text-muted-foreground">
              Banco: {item.wordBank.join(", ")}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
