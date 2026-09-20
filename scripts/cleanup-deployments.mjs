// Deletes old GitHub "Deployments" records (the counter in the repo sidebar).
// These are only history entries: deleting them does NOT touch the live sites.
//
//   node scripts/cleanup-deployments.mjs            dry run: shows what would go
//   node scripts/cleanup-deployments.mjs --yes      actually delete
//   node scripts/cleanup-deployments.mjs --yes --keep-env "Production – taboo-inferno"
//
// For every environment named with --keep-env (repeatable) the NEWEST record is
// kept; everything else is deleted. Auth: GITHUB_TOKEN env var if set, otherwise
// the token git already has for github.com (Git Credential Manager). The token is
// never printed.

import { execSync, spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const reallyDelete = args.includes('--yes')
const keepEnvs = args.flatMap((a, i) => (a === '--keep-env' && args[i + 1] ? [args[i + 1]] : []))
if (keepEnvs.length === 0) keepEnvs.push('Production – taboo-inferno')

const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim()
const repo = remote.match(/github\.com[:/](.+?\/.+?)(?:\.git)?$/)?.[1]
if (!repo) throw new Error(`Not a GitHub remote: ${remote}`)

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  const out = spawnSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8' })
  const token = out.stdout?.match(/^password=(.+)$/m)?.[1]
  if (!token) throw new Error('No GitHub credentials found. Set GITHUB_TOKEN (needs "repo" scope) and retry.')
  return token
}

const token = getToken()
const api = async (method, path, body) => {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok && res.status !== 204) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

const all = []
for (let page = 1; ; page++) {
  const batch = await api('GET', `/deployments?per_page=100&page=${page}`)
  all.push(...batch)
  if (batch.length < 100) break
}

// API returns newest first: the first record seen for a kept environment survives
const kept = new Set()
const doomed = all.filter((d) => {
  if (keepEnvs.includes(d.environment) && !kept.has(d.environment)) {
    kept.add(d.environment)
    return false
  }
  return true
})

const counts = {}
for (const d of doomed) counts[d.environment] = (counts[d.environment] || 0) + 1
console.log(`${repo}: ${all.length} deployment records, keeping ${all.length - doomed.length} (newest of: ${keepEnvs.join(', ')})`)
console.table(counts)

if (!reallyDelete) {
  console.log('\nDry run. Re-run with --yes to delete the records above.')
  process.exit(0)
}

let done = 0
for (const d of doomed) {
  // GitHub refuses to delete an active deployment: mark it inactive first
  await api('POST', `/deployments/${d.id}/statuses`, { state: 'inactive' })
  await api('DELETE', `/deployments/${d.id}`)
  if (++done % 10 === 0) console.log(`  ${done}/${doomed.length}`)
}
console.log(`Deleted ${done} deployment records.`)
