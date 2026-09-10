import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;

// E2E sobe os emuladores + o Next dev e roda o cenário cadastro -> login
// (Fase 1). Compartilham o emulador, então roda em série com 1 worker.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm emulators",
      port: 4000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "pnpm --filter @elp/web dev",
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_USE_EMULATORS: "true",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-elp",
        NEXT_PUBLIC_FIREBASE_API_KEY: "demo",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-elp.firebaseapp.com",
        NEXT_PUBLIC_FIREBASE_APP_ID: "demo",
      },
    },
  ],
});
