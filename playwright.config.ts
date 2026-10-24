import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    command: `node -e "require('fs').rmSync('data/e2e', { recursive: true, force: true })" && npx next dev -p 3100`,
    url: "http://localhost:3100/login",
    env: { DB_PATH: "data/e2e/credito.db" },
    timeout: 120_000,
  },
});
