// Formatação/normalização do código de inscrição de sala, só para exibição
// e leitura de entrada no client — a geração e a validação de unicidade
// ficam no callable createClass (Admin SDK).
// Manter em sincronia com functions/src/classes/enrollment-code.ts.
const CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXYZ23456789";
const CODE_LENGTH = 6;

/** "bcd-234" | "bcd 234" -> "BCD234". */
export function normalizeCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return [...cleaned].filter((c) => CODE_ALPHABET.includes(c)).join("");
}

/** "BCD234" -> "BCD-234". */
export function formatCode(code: string): string {
  const c = normalizeCode(code);
  if (c.length !== CODE_LENGTH) return c;
  return `${c.slice(0, 3)}-${c.slice(3)}`;
}

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}
