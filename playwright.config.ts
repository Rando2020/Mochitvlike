import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./cloud-tests",
  workers: 1,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:3000", screenshot: "only-on-failure", trace: "off" },
  webServer: { command: "npm run build && npm run start -- --hostname 127.0.0.1", url: "http://127.0.0.1:3000", timeout: 180000, reuseExistingServer: false }
});
