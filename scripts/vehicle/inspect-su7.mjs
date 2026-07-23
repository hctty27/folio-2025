import { readFile, stat } from 'node:fs/promises'

const paths = [
    new URL('../../static/vehicle/su7.glb', import.meta.url),
    new URL('../../static/vehicle/su7-compressed.glb', import.meta.url),
]
const requiredPrefixes = [ 'chassis', 'bodyPainted', 'wheelContainer', 'wheelSuspension', 'wheelCylinder', 'wheelPainted' ]

function readJsonChunk(buffer)
{
    if(buffer.toString('ascii', 0, 4) !== 'glTF')
        throw new Error('Invalid GLB magic header')

    let offset = 12
    while(offset < buffer.length)
    {
        const length = buffer.readUInt32LE(offset)
        const type = buffer.readUInt32LE(offset + 4)
        offset += 8
        const data = buffer.subarray(offset, offset + length)
        offset += length

        if(type === 0x4E4F534A)
            return JSON.parse(data.toString('utf8').replace(/[\u0000 ]+$/g, ''))
    }

    throw new Error('GLB JSON chunk not found')
}

for(const path of paths)
{
    const info = await stat(path)
    if(info.size >= 5 * 1024 * 1024)
        throw new Error(`${path.pathname} exceeds 5 MiB: ${info.size}`)

    const json = readJsonChunk(await readFile(path))
    const names = (json.nodes ?? []).map(node => node.name ?? '')
    const missing = requiredPrefixes.filter(prefix => !names.some(name => new RegExp(`^${prefix}`, 'i').test(name)))

    if(missing.length)
        throw new Error(`${path.pathname} is missing nodes: ${missing.join(', ')}`)
    if((json.materials?.length ?? 0) > 8)
        throw new Error(`${path.pathname} has too many materials: ${json.materials.length}`)

    console.log(`${path.pathname}: ${info.size} bytes, ${json.nodes.length} nodes, ${json.materials?.length ?? 0} materials`)
}
