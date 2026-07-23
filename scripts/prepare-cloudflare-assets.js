import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url))
const musicDirectory = path.join(distDirectory, 'sounds', 'musics')
const ignoreFile = path.join(distDirectory, '.assetsignore')

await mkdir(distDirectory, { recursive: true })

let removedWavFiles = 0

try
{
    const entries = await readdir(musicDirectory, { withFileTypes: true })

    for(const entry of entries)
    {
        if(entry.isFile() && entry.name.toLowerCase().endsWith('.wav'))
        {
            await rm(path.join(musicDirectory, entry.name))
            removedWavFiles++
        }
    }
}
catch(error)
{
    if(error.code !== 'ENOENT')
        throw error
}

await writeFile(ignoreFile, 'sounds/musics/*.wav\n', 'utf8')

console.log(`Prepared Cloudflare assets: removed ${removedWavFiles} WAV master file(s) and created dist/.assetsignore`)
