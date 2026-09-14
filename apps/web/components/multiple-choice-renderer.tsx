/**
 * Visualização como o aluno veria (sem marcar a correta) — só leitura
 * nesta fase, sem captura de resposta (ver docs/plano-fase-3.md §1.1).
 * A versão interativa entra na Fase 4 junto de createAttempt/submitAttempt.
 */
export function MultipleChoiceRenderer({
  items,
}: {
  items: { question: string; options: string[] }[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhuma questão ainda.</p>
    );
  }

  return (
    <ol className="space-y-4">
      {items.map((item, index) => (
        <li key={index}>
          <p className="font-medium">
            {index + 1}. {item.question}
          </p>
          <ul className="mt-1 space-y-1 text-sm">
            {item.options.map((option, i) => (
              <li key={i} className="flex items-center gap-2">
                <input type="radio" disabled />
                <span>{option}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
