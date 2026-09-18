import { test } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers";

/**
 * RNF-007 (Fase 6 PR 6.7) — páginas públicas/legais que nenhum outro
 * spec visita (as telas autenticadas já ganham a checagem embutida nos
 * specs que as exercitam, ver e2e/helpers.ts `expectNoA11yViolations`).
 * Conteúdo estático renderizado a partir de docs/lgpd/*.md, importante
 * pra acessibilidade porque é a primeira coisa que um visitante (ou um
 * responsável legal lendo o termo de consentimento) vê.
 */
const PUBLIC_PAGES = [
  { path: "/", name: "landing" },
  { path: "/termos", name: "termos de uso" },
  { path: "/privacidade", name: "política de privacidade" },
  { path: "/cookies", name: "política de cookies" },
  { path: "/termo-responsavel", name: "termo do responsável legal" },
];

for (const { path, name } of PUBLIC_PAGES) {
  test(`acessibilidade: página pública "${name}" sem violações (RNF-007)`, async ({
    page,
  }) => {
    await page.goto(path);
    await expectNoA11yViolations(page);
  });
}
