// Builds the static web bundle for the store apps and syncs it into the native
// projects. Store builds are always serverless (P2P) and never use the
// trademarked web name.
import { spawnSync } from 'node:child_process'

const env = {
  ...process.env,
  NEXT_OUTPUT: 'export',
  NEXT_PUBLIC_GAME_MODE: 'p2p',
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Inferno Words',
}

for (const [cmd, args] of [
  ['npx', ['next', 'build']],
  ['npx', ['cap', 'sync']],
]) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', env, shell: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
