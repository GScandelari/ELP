import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  formatCode,
  generateCode,
  isValidCode,
  normalizeCode,
} from "./enrollment-code";

describe("enrollment-code", () => {
  it("gera códigos com o tamanho e o alfabeto certos", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect([...code].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
    }
  });

  it("não usa vogais nem os símbolos ambíguos I/O/0/1", () => {
    expect(CODE_ALPHABET).not.toMatch(/[AEIOU01]/);
  });

  it("tem entropia suficiente (sem repetições numa amostra pequena)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateCode());
    expect(seen.size).toBe(1000);
  });

  it("normaliza entrada com separadores e minúsculas", () => {
    expect(normalizeCode("bcd-234")).toBe("BCD234");
    expect(normalizeCode(" bcd 234 ")).toBe("BCD234");
    expect(normalizeCode("BCD234")).toBe("BCD234");
  });

  it("descarta símbolos fora do alfabeto ao normalizar", () => {
    expect(normalizeCode("aBcD234")).toBe("BCD234"); // 'A' cai fora
  });

  it("formata com hífen no meio", () => {
    expect(formatCode("BCD234")).toBe("BCD-234");
    expect(formatCode("bcd234")).toBe("BCD-234");
  });

  it("formata sem hífen quando o tamanho não bate", () => {
    expect(formatCode("BCD")).toBe("BCD");
  });

  it("isValidCode aceita só o formato canônico", () => {
    expect(isValidCode(generateCode())).toBe(true);
    expect(isValidCode("BCD-234")).toBe(false);
    expect(isValidCode("BCD23")).toBe(false);
    expect(isValidCode("ABC234")).toBe(false); // 'A' não está no alfabeto
  });
});
