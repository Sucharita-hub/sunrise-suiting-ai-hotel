import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "npm run dev",
      cwd: "../backend",
      port: 5000,
      reuseExistingServer: true,
      timeout: 60_000
    },
    {
      command: "npm run dev",
      cwd: "../frontend",
      port: 5173,
      reuseExistingServer: true,
      timeout: 60_000
    }
  ]
});
