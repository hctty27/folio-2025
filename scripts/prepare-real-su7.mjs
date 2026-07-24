import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const partsDirectory = path.join(root, '.su7-upload')
const vehicleDirectory = path.join(root, 'static', 'vehicle')
const expectedSha256 = '444b923820765d7ca88023ef72edabf59977d7128016e0c6ebae53d30593824d'

const partNames = (await readdir(partsDirectory))
    .filter((name) => /^part-\d+$/.test(name))
    .sort()

if(partNames.length !== 9)
    throw new Error(`Expected 9 SU7 asset parts, found ${partNames.length}`)

const encodedParts = await Promise.all(
    partNames.map((name) => readFile(path.join(partsDirectory, name), 'utf8'))
)
const gzipBuffer = Buffer.from(encodedParts.join('').replace(/\s+/g, ''), 'base64')
const glbBuffer = gunzipSync(gzipBuffer)
const actualSha256 = createHash('sha256').update(glbBuffer).digest('hex')

if(actualSha256 !== expectedSha256)
    throw new Error(`SU7 SHA-256 mismatch: expected ${expectedSha256}, received ${actualSha256}`)

if(glbBuffer.toString('ascii', 0, 4) !== 'glTF')
    throw new Error('Invalid SU7 GLB magic')

const jsonLength = glbBuffer.readUInt32LE(12)
const jsonType = glbBuffer.readUInt32LE(16)
if(jsonType !== 0x4e4f534a)
    throw new Error('SU7 GLB is missing its JSON chunk')

const gltf = JSON.parse(
    glbBuffer.subarray(20, 20 + jsonLength).toString('utf8').replace(/\0+$/g, '').trim()
)
const nodeNames = new Set((gltf.nodes ?? []).map((node) => node.name))
const requiredNodes = [
    'chassis',
    'bodyPainted',
    'wheelContainer',
    'wheelSuspension',
    'wheelCylinder',
    'wheelPainted',
]
const missingNodes = requiredNodes.filter((name) => !nodeNames.has(name))
if(missingNodes.length)
    throw new Error(`SU7 GLB is missing required nodes: ${missingNodes.join(', ')}`)

await mkdir(vehicleDirectory, { recursive: true })
await Promise.all([
    writeFile(path.join(vehicleDirectory, 'default.glb'), glbBuffer),
    writeFile(path.join(vehicleDirectory, 'default-compressed.glb'), glbBuffer),
])

await writeFile(path.join(vehicleDirectory, 'SU7_MODEL_CREDITS.md'), `# Xiaomi SU7 model credit

This work is based on **“Xiaomi SU7”** by **GT Cars: Hyperspeed (@Car2022)**.

- Source: https://sketchfab.com/3d-models/xiaomi-su7-ca2cda599f5341068c992c9f44551bf9
- Author: https://sketchfab.com/Car2022
- License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- Changes: transformed for the folio-2025 coordinate system, separated the wheel rig, removed duplicate fixed wheels, renamed gameplay nodes, optimized for web delivery, and changed the default paint to elegant grey.
`)

async function patchFile(relativePath, replacements)
{
    const filePath = path.join(root, relativePath)
    let source = await readFile(filePath, 'utf8')

    for(const [oldValue, newValue] of replacements)
    {
        if(source.includes(oldValue))
            source = source.replace(oldValue, newValue)
        else if(!source.includes(newValue))
            throw new Error(`Unable to patch ${relativePath}; expected source not found: ${oldValue}`)
    }

    await writeFile(filePath, source)
}

await patchFile('sources/Game/Physics/PhysicsVehicle.js', [
    ['parameters: [ 1.3, 0.4, 0.85 ]', 'parameters: [ 2.15, 0.4, 0.9 ]'],
    ['parameters: [ 0.5, 0.15, 0.65 ]', 'parameters: [ 1.05, 0.15, 0.72 ]'],
    ['parameters: [ 1.5, 0.5, 0.9 ]', 'parameters: [ 2.2, 0.5, 0.98 ]'],
    ['offset: { x: 0.90, y: 0, z: 0.75 }', 'offset: { x: 1.317, y: 0, z: 0.755 }'],
])

await patchFile('sources/Game/World/VisualVehicle.js', [
    ['position.set(-1.28, 0.1, -0.55)', 'position.set(-2.05, 0.1, -0.62)'],
    ['position.set(-1.28, 0.1, 0.55)', 'position.set(-2.05, 0.1, 0.62)'],
])

await patchFile('sources/Game/Game.js', [
    ['`vehicle/default${compressedModelSuffix}.glb${cb}`', '`vehicle/default${compressedModelSuffix}.glb?su7=real-v1`'],
])

console.log(`Prepared verified Xiaomi SU7 vehicle (${glbBuffer.length} bytes, SHA-256 ${actualSha256})`)
