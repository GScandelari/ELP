import { readFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";

// Renderiza os documentos legais (Markdown -> HTML) no servidor.
// O conteudo vem de arquivos versionados em apps/web/content/ e e confiavel
// (nao ha entrada de usuario), por isso o HTML pode ser injetado direto.
export type LegalSlug = "privacidade" | "termos" | "cookies";

export function getLegalHtml(slug: LegalSlug): string {
  const path = join(process.cwd(), "content", `${slug}.md`);
  const md = readFileSync(path, "utf8");
  return marked.parse(md, { async: false });
}
