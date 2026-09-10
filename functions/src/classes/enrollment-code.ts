import { randomInt } from "node:crypto";

/**
 * Alfabeto do código de inscrição: 29 símbolos — consoantes (sem vogais,
 * para não formar palavras; isso já exclui os ambíguos I e O) mais os
 * dígitos 2–9. 29^6 ≈ 594 milhões de combinações, folga de sobra para a
 * escala do MVP.
 */
export const CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXYZ23456789"; // 21 consoantes + 8 dígitos
export const CODE_LENGTH = 6;

/** Gera um código aleatório de 6 caracteres do alfabeto (ex.: "BCD234"). */
export function generateCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Normaliza o que o aluno digitou para a forma canônica armazenada:
 * maiúsculas, sem separadores, só os símbolos do alfabeto.
 * "bcd-234" | "bcd 234" -> "BCD234".
 */
export function normalizeCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return [...cleaned].filter((c) => CODE_ALPHABET.includes(c)).join("");
}

/** Apresenta o código com um hífen no meio: "BCD234" -> "BCD-234". */
export function formatCode(code: string): string {
  const c = normalizeCode(code);
  if (c.length !== CODE_LENGTH) return c;
  return `${c.slice(0, 3)}-${c.slice(3)}`;
}

/** `true` se a string já é um código canônico válido. */
export function isValidCode(code: string): boolean {
  return (
    code.length === CODE_LENGTH &&
    [...code].every((c) => CODE_ALPHABET.includes(c))
  );
}
