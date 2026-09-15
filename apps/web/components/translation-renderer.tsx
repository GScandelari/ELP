/**
 * Visualização como o aluno veria (sem revelar a opção certa) — só
 * leitura nesta fase, sem captura de resposta (ver docs/plano-fase-3.md
 * §1.1). A versão interativa entra na Fase 4 junto de
 * createAttempt/submitAttempt. `mode` só muda a UI (rádio vs digitar o
 * número) — a resposta certa nunca aparece aqui.
 */
export function TranslationRenderer({
  items,
}: {
  items: {
    mode: "MULTIPLE_CHOICE" | "INDEXING";
    source: string;
    options: string[];
  }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>;
  }

  return (
    <ol className="space-y-4">
      {items.map((item, index) => (
        <li key={index}>
          <p className="font-medium">
            {index + 1}. {item.source}
          </p>
          {item.mode === "INDEXING" ? (
            <div className="mt-1 space-y-1 text-sm">
              <ol className="list-decimal space-y-1 pl-5">
                {item.options.map((option, i) => (
                  <li key={i}>{option}</li>
                ))}
              </ol>
              <input
                disabled
                placeholder="Número da opção certa"
                className="mt-1 w-40 rounded border border-border px-1 text-sm"
              />
            </div>
          ) : (
            <ul className="mt-1 space-y-1 text-sm">
              {item.options.map((option, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input type="radio" disabled />
                  <span>{option}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
