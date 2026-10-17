// A local build only. Never invokes Vercel, uploads artifacts or connects to the API.
import os from 'node:os'
import {mkdir, statfs, writeFile} from 'node:fs/promises'
import {spawn} from 'node:child_process'
import {validateStagingConfig} from './check-staging-config.mjs'

const MiB = 1024 ** 2
const requiredRam = 1536 * MiB
const disk = await statfs(process.cwd())
const available = os.freemem()
if (available < requiredRam || disk.bavail * disk.bsize < 2 * 1024 ** 3) {
  console.error(`BLOCKED: available RAM ${(available / MiB).toFixed(1)} MiB; need 1536 MiB and 2 GiB disk`)
  process.exit(2)
}
validateStagingConfig(process.env)
const startedAt = new Date().toISOString()
let minimumFree = available
let stoppedForMemory = false
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], {
  stdio: 'inherit', detached: process.platform !== 'win32',
  env: {...process.env, NEXT_TELEMETRY_DISABLED: '1', ZOCLIP_LOW_MEMORY: '1',
    NODE_OPTIONS: '--max-old-space-size=384'},
})
const monitor = setInterval(() => {
  minimumFree = Math.min(minimumFree, os.freemem())
  if (!stoppedForMemory && minimumFree < 256 * MiB) {
    stoppedForMemory = true
    console.error('BLOCKED: stopping only this build process tree below 256 MiB available RAM')
    if (process.platform === 'win32') spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {stdio: 'ignore'})
    else {try {process.kill(-child.pid, 'SIGTERM')} catch { /* Build already exited. */ }}
  }
}, 2000)
child.on('error', () => {clearInterval(monitor); process.exitCode = 1})
child.on('exit', async code => {
  clearInterval(monitor)
  const result = stoppedForMemory ? 'BLOCKED' : code === 0 ? 'PASS' : 'FAIL'
  const receipt = {startedAt, finishedAt: new Date().toISOString(), node: process.version,
    bundler: 'webpack', heapCapMiB: 384, requiredStartRamMiB: 1536,
    minimumAvailableMiB: Math.round(minimumFree / MiB), result, exitCode: code,
    scope: 'local production build; no deployment; reserved example origins must be rebuilt for staging'}
  await mkdir('test-results', {recursive: true})
  await writeFile('test-results/staging-production-build.json', JSON.stringify(receipt, null, 2))
  console.log(`Production build: ${result}; minimum sampled free RAM: ${receipt.minimumAvailableMiB} MiB`)
  process.exitCode = result === 'PASS' ? 0 : stoppedForMemory ? 2 : 1
})
