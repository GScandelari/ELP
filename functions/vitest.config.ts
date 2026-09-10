import { defineConfig } from "vitest/config";

// Testes unitários das Functions (sem emulador). Rodam em `pnpm test`.
// Os testes de integração ficam em `test/` e usam vitest.integration.config.ts.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
