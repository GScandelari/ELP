"use client";

import { useMemo } from "react";

function secureRandomInt(maxExclusive: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % maxExclusive;
}

function shuffled<T>(items: T[]): T[] {
  // embaralho de exibição, não é segredo criptográfico — mas o
  // Math.random() dispara o alerta de PRNG inseguro do SonarCloud
  // (S2245), então uso a Web Crypto API pra já nascer limpo.
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

type Pair = { id: string; left: string; right: string };

/**
 * Visualização como o aluno veria (pares embaralhados, sem revelar o
 * gabarito) — só leitura nesta fase, sem captura de resposta (ver
 * docs/plano-fase-3.md §1.1). A versão interativa (clique/seleção —
 * decisão §8.3, sem drag-and-drop nesta fase) entra na Fase 4 junto de
 * createAttempt/submitAttempt.
 */
export function MeaningMatchingRenderer({
  items,
}: {
  items: { pairs: Pair[] }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>;
  }

  return (
    <ol className="space-y-6">
      {items.map((item, index) => (
        <MeaningMatchingPreviewItem
          key={index}
          index={index}
          pairs={item.pairs}
        />
      ))}
    </ol>
  );
}

function MeaningMatchingPreviewItem({
  index,
  pairs,
}: {
  index: number;
  pairs: Pair[];
}) {
  // mesma lista de opções (embaralhada) em todo select — nenhuma delas
  // denuncia qual par é o certo, e os selects estão desabilitados mesmo.
  const rightOptions = useMemo(
    () => shuffled(pairs.map((p) => p.right)),
    [pairs],
  );

  return (
    <li>
      <p className="font-medium">{index + 1}. Relacione:</p>
      <ul className="mt-1 space-y-1 text-sm">
        {pairs.map((pair) => (
          <li key={pair.id} className="flex items-center gap-2">
            <span>{pair.left}</span>
            <span className="text-muted-foreground">→</span>
            <select
              disabled
              className="rounded border border-border px-1 text-sm"
            >
              <option>—</option>
              {rightOptions.map((right, i) => (
                <option key={i}>{right}</option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </li>
  );
}
