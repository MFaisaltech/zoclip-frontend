import {defineConfig} from '@playwright/test'

process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'

// Requires the explicitly isolated generation_browser_fixture.py harness.
export default defineConfig({
  testDir: './tests/browser', testMatch: ['generation-live.spec.ts', 'auth.spec.ts'],
  workers: 1, retries: 0, timeout: 180000, expect: {timeout: 30000}, reporter: 'list',
  outputDir: './test-results/live-generation',
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev --webpack -p 3000',
    url: 'http://localhost:3000', timeout: 120000,
    env: {NEXT_PUBLIC_API_ORIGIN: 'http://localhost:8017', NEXT_PUBLIC_APP_ORIGIN: 'http://localhost:3000',
      NEXT_PUBLIC_PRIVATE_STAGING: 'false', NEXT_PUBLIC_ENABLE_REGISTRATION: 'true',
      NEXT_PUBLIC_ENABLE_ANALYTICS: 'false', NEXT_TELEMETRY_DISABLED: '1', ZOCLIP_LOW_MEMORY: '1'},
  },
  use: {baseURL: 'http://localhost:3000', browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', trace: 'off', screenshot: 'off', video: 'off'},
})
