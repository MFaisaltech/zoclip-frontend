import { defineConfig } from '@playwright/test'

// Installed Playwright supports disabling its automatic failure-page snapshots.
// Those snapshots can include the verification/recovery input values.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    // Auth tokens, passwords and mailbox content must not become test artifacts.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
})
