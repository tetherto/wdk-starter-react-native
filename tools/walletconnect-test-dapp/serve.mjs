// Builds the WalletConnect test dApp and serves it on http://localhost:8765.
// Run with `npm run test-dapp`. See docs/WALLETCONNECT.md.
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'dotenv'
import { build } from 'esbuild'

const here = dirname(fileURLToPath(import.meta.url))
const PORT = 8765

// The same project ID the wallet uses, read from the app's .env.
function projectId () {
  try {
    return parse(readFileSync(join(here, '../../.env'))).EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ''
  } catch {
    return ''
  }
}

await build({
  entryPoints: [join(here, 'app.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: join(here, 'dist/app.js'),
  define: { WC_PROJECT_ID: JSON.stringify(projectId()), global: 'globalThis' },
  logLevel: 'warning'
})

// Only these three files are served.
const FILES = {
  '/': ['index.html', 'text/html'],
  '/dist/app.js': ['dist/app.js', 'text/javascript'],
  '/wdk-logo.svg': ['wdk-logo.svg', 'image/svg+xml']
}

createServer((req, res) => {
  const file = FILES[new URL(req.url, 'http://localhost').pathname]
  if (!file) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': file[1], 'cache-control': 'no-store' })
  res.end(readFileSync(join(here, file[0])))
}).listen(PORT, '127.0.0.1', () => {
  console.log(`WalletConnect test dApp: http://localhost:${PORT}`)
})
