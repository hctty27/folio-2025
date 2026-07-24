import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const modelPath = new URL('../static/vehicle/su7-real-web.glb', import.meta.url)
const expectedSize = 422988
const expectedSha256 = '444b923820765d7ca88023ef72edabf59977d7128016e0c6ebae53d30593824d'
const requiredNodes = [
    'chassis',
    'bodyPainted',
    'wheelContainer',
    'wheelSuspension',
    'wheelCylinder',
    'wheelPainted',
]

const buffer = await readFile(modelPath)

if(buffer.length !== expectedSize)
    throw new Error(`Unexpected SU7 file size: ${buffer.length}; expected ${expectedSize}`)

const actualSha256 = createHash('sha256').update(buffer).digest('hex')
if(actualSha256 !== expectedSha256)
    throw new Error(`Unexpected SU7 SHA-256: ${actualSha256}`)

if(buffer.toString('ascii', 0, 4) !== 'glTF')
    throw new Error('The SU7 file is not a binary glTF (GLB) asset')

const jsonLength = buffer.readUInt32LE(12)
const jsonType = buffer.readUInt32LE(16)
if(jsonType !== 0x4e4f534a)
    throw new Error('The SU7 GLB does not contain a JSON chunk')

const gltf = JSON.parse(
    buffer.subarray(20, 20 + jsonLength).toString('utf8').replace(/\0+$/g, '').trim()
)
const nodeNames = new Set((gltf.nodes ?? []).map((node) => node.name))
const missingNodes = requiredNodes.filter((name) => !nodeNames.has(name))

if(missingNodes.length)
    throw new Error(`The SU7 GLB is missing required nodes: ${missingNodes.join(', ')}`)

console.log(`Validated Xiaomi SU7 GLB: ${buffer.length} bytes, ${gltf.nodes.length} nodes, SHA-256 ${actualSha256}`)
