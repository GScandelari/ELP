/**
 * Embaralho de exibição (Fisher-Yates) — não é segredo criptográfico, mas
 * o Math.random() dispara o alerta de PRNG inseguro do SonarCloud (regra
 * S2245), então já nasce com a Web Crypto API.
 */
export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function secureRandomInt(maxExclusive: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % maxExclusive;
}
