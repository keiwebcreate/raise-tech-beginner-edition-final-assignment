import { defineConfig, devices } from "@playwright/test";

// 通しのテスト（詳細設計書 6.2）。Chrome・Firefox・Safari 系（WebKit）の3つで動かす。
// 動かす前に、DB（docker compose up -d）・Laravel（8000）・Next.js（3000）を起動しておく
//
// password.spec.ts は持ち主のパスワードを変えるので、ほかのブラウザのログインが切れる。
// 同時に動くテストを巻き込まないよう、3つのブラウザが終わってから、Chrome だけで動かす
const PASSWORD_SPEC = /password\.spec\.ts/;

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
    {
      name: "chromium",
      testIgnore: PASSWORD_SPEC,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testIgnore: PASSWORD_SPEC,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testIgnore: PASSWORD_SPEC,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "password",
      testMatch: PASSWORD_SPEC,
      dependencies: ["chromium", "firefox", "webkit"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
