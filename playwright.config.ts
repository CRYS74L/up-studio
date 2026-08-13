import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173', port: 4173, reuseExistingServer: true },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'ipad', use: { ...devices['iPad Mini'], browserName: 'chromium' } }
  ]
});
