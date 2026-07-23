import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDirectory = fileURLToPath(new URL('../', import.meta.url))
const musicDirectory = path.join(projectDirectory, 'static', 'sounds', 'musics')
const commitSha = process.env.WORKERS_CI_COMMIT_SHA || 'local'

console.log(`Cloudflare build source commit: ${commitSha}`)

const entries = await readdir(musicDirectory, { withFileTypes: true })
const wavFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.wav'))
    .map((entry) => entry.name)

if(wavFiles.length > 0)
{
    throw new Error(`Unexpected WAV master file(s) in source: ${wavFiles.join(', ')}`)
}

console.log('Cloudflare source verification passed: no WAV master files found')
