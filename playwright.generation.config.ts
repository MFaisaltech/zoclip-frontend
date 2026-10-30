import {defineConfig} from '@playwright/test'

// Local feature verification only. Every API request is intercepted by the tests.
export default defineConfig({
  testDir: './tests/browser', testMatch: 'generation-studio.spec.ts', workers: 1, retries: 0,
  timeout: 45000, expect: {timeout: 15000}, reporter: 'list',
  outputDir: './test-results/generation-studio',
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev -p 3028',
    url: 'http://localhost:3028', reuseExistingServer: !process.env.CI, timeout: 120000,
    env: {NEXT_PUBLIC_API_ORIGIN: 'http://localhost:8017', NEXT_PUBLIC_APP_ORIGIN: 'http://localhost:3028',
      NEXT_PUBLIC_PRIVATE_STAGING: 'false', NEXT_PUBLIC_ENABLE_ANALYTICS: 'false', NEXT_TELEMETRY_DISABLED: '1'},
  },
  use: {baseURL: 'http://localhost:3028', browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    trace: 'off', screenshot: 'off', video: 'off'},
})
