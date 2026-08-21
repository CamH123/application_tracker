import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run db:migrate -w server && npm run dev -w server",
      url: "http://127.0.0.1:3001/api/health",
      env: {
        DATABASE_URL:
          process.env.TEST_DATABASE_URL ??
          "postgres://application_tracker:application_tracker@127.0.0.1:55432/application_tracker_test",
        TOKEN_ENCRYPTION_KEY:
          "0000000000000000000000000000000000000000000000000000000000000000",
        CLIENT_ORIGIN: "http://127.0.0.1:5173",
      },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev -w client -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      env: { VITE_API_URL: "http://127.0.0.1:3001/api" },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
