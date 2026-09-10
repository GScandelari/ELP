import { defineConfig } from "vitest/config";

// Testes de integração das Functions — chamam os callables contra os
// emuladores de Firestore/Auth. Disparados por `pnpm test:functions` na
// raiz, dentro de `firebase emulators:exec`.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
