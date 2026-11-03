import { defineConfig, devices } from "@playwright/test";

// 通しのテスト（詳細設計書 6.2）。Chrome・Firefox・Safari 系（WebKit）の3つで動かす。
// 動かす前に、DB（docker compose up -d）・Laravel（8000）・Next.js（3000）を起動しておく
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
