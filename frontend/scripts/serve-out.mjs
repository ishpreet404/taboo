// Tiny static server for the exported store build (./out), e.g. for store screenshots:
//   npm run build:mobile && node scripts/serve-out.mjs   ->  http://localhost:3002
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../out', import.meta.url)))
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain' }

createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname))
    let file = join(root, path)
    if (!file.startsWith(root)) throw new Error('outside root')
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' })
    res.end(await readFile(file))
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
}).listen(3002, () => console.log('store build on http://localhost:3002'))
