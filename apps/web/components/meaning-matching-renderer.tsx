type LeftItem = { id: string; left: string };
type RightItem = { id: string; right: string };

/**
 * Visualização como o aluno veria (sem revelar o gabarito) — só leitura
 * nesta fase, sem captura de resposta (ver docs/plano-fase-3.md §1.1). A
 * versão interativa (clique/seleção — decisão §8.3, sem drag-and-drop
 * nesta fase) entra na Fase 4 junto de createAttempt/submitAttempt.
 *
 * Recebe o mesmo formato que `toStudentContent` do handler produz
 * (`leftItems`/`rightItems` já embaralhados de forma independente pelo
 * chamador — ver `lib/shuffle.ts` para o preview ao vivo do professor, ou
 * já congelados assim num `contentSnapshot` publicado) — não embaralha
 * de novo aqui, só exibe.
 */
export function MeaningMatchingRenderer({
  items,
}: {
  items: { leftItems: LeftItem[]; rightItems: RightItem[] }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>;
  }

  return (
    <ol className="space-y-6">
      {items.map((item, index) => (
        <li key={index}>
          <p className="font-medium">{index + 1}. Relacione:</p>
          <ul className="mt-1 space-y-1 text-sm">
            {item.leftItems.map((leftItem) => (
              <li key={leftItem.id} className="flex items-center gap-2">
                <span>{leftItem.left}</span>
                <span className="text-muted-foreground">→</span>
                <select
                  disabled
                  aria-label={`Relacionar "${leftItem.left}" (questão ${index + 1})`}
                  className="rounded border border-border px-1 text-sm"
                >
                  <option>—</option>
                  {item.rightItems.map((rightItem) => (
                    <option key={rightItem.id}>{rightItem.right}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
