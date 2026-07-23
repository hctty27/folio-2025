import { mkdir, writeFile } from 'node:fs/promises'

const chunks = []
const bufferViews = []
const accessors = []
const meshes = []
const nodes = []
const materials = []
let byteOffset = 0

function align4(value)
{
    return (value + 3) & ~3
}

function addChunk(buffer, target)
{
    const aligned = align4(byteOffset)
    if(aligned > byteOffset)
        chunks.push(Buffer.alloc(aligned - byteOffset))

    byteOffset = aligned
    const index = bufferViews.length
    bufferViews.push({
        buffer: 0,
        byteOffset,
        byteLength: buffer.length,
        ...(target ? { target } : {}),
    })
    chunks.push(buffer)
    byteOffset += buffer.length
    return index
}

function addAccessor(array, componentType, type, target, min, max)
{
    const buffer = Buffer.from(array.buffer, array.byteOffset, array.byteLength)
    const view = addChunk(buffer, target)
    const componentCounts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }
    const index = accessors.length
    accessors.push({
        bufferView: view,
        componentType,
        count: array.length / componentCounts[type],
        type,
        ...(min ? { min } : {}),
        ...(max ? { max } : {}),
    })
    return index
}

function addMaterial(name, color, metallic = 0, roughness = 0.7, emissive = null)
{
    const index = materials.length
    materials.push({
        name,
        pbrMetallicRoughness: {
            baseColorFactor: color,
            metallicFactor: metallic,
            roughnessFactor: roughness,
        },
        ...(emissive ? { emissiveFactor: emissive } : {}),
        doubleSided: false,
    })
    return index
}

function geometryAccessors(positions, indices)
{
    const positionArray = new Float32Array(positions)
    const indexArray = new Uint16Array(indices)
    const min = [ Infinity, Infinity, Infinity ]
    const max = [ -Infinity, -Infinity, -Infinity ]

    for(let offset = 0; offset < positionArray.length; offset += 3)
    {
        for(let axis = 0; axis < 3; axis++)
        {
            min[axis] = Math.min(min[axis], positionArray[offset + axis])
            max[axis] = Math.max(max[axis], positionArray[offset + axis])
        }
    }

    return {
        position: addAccessor(positionArray, 5126, 'VEC3', 34962, min, max),
        indices: addAccessor(indexArray, 5123, 'SCALAR', 34963, [ 0 ], [ Math.max(...indexArray) ]),
    }
}

const cube = geometryAccessors([
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
    -0.5,  0.5, -0.5,
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5,
], [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3,
    3, 7, 4, 3, 4, 0,
])

function cylinderGeometry(segments = 16)
{
    const positions = []
    const indices = []

    for(const z of [ -0.5, 0.5 ])
    {
        for(let segment = 0; segment < segments; segment++)
        {
            const angle = segment / segments * Math.PI * 2
            positions.push(Math.cos(angle), Math.sin(angle), z)
        }
    }

    const bottomCenter = positions.length / 3
    positions.push(0, 0, -0.5)
    const topCenter = positions.length / 3
    positions.push(0, 0, 0.5)

    for(let segment = 0; segment < segments; segment++)
    {
        const next = (segment + 1) % segments
        const a = segment
        const b = next
        const c = segments + segment
        const d = segments + next
        indices.push(a, b, d, a, d, c, bottomCenter, b, a, topCenter, c, d)
    }

    return geometryAccessors(positions, indices)
}

const cylinder = cylinderGeometry()

const grey = addMaterial('雅灰', [ 0.32, 0.34, 0.35, 1 ], 0.38, 0.52)
const dark = addMaterial('轮胎', [ 0.025, 0.03, 0.035, 1 ], 0.05, 0.82)
const glass = addMaterial('玻璃', [ 0.04, 0.08, 0.10, 0.72 ], 0.05, 0.18)
const white = addMaterial('前灯', [ 1, 1, 1, 1 ], 0, 0.25, [ 1, 1, 1 ])
const red = addMaterial('尾灯', [ 1, 0.015, 0.01, 1 ], 0, 0.28, [ 1, 0.015, 0.01 ])
const amber = addMaterial('转向灯', [ 1, 0.30, 0.01, 1 ], 0, 0.28, [ 1, 0.30, 0.01 ])
const purple = addMaterial('能量核心', [ 0.28, 0.08, 0.55, 1 ], 0.12, 0.30, [ 0.25, 0.04, 0.50 ])

function addMesh(name, geometry, material)
{
    const index = meshes.length
    meshes.push({
        name: `${name}Geometry`,
        primitives: [ {
            attributes: { POSITION: geometry.position },
            indices: geometry.indices,
            material,
        } ],
    })
    return index
}

function addNode(name, parent, mesh = null, translation = null, scale = null, rotation = null)
{
    const index = nodes.length
    nodes.push({
        name,
        ...(mesh !== null ? { mesh } : {}),
        ...(translation ? { translation } : {}),
        ...(scale ? { scale } : {}),
        ...(rotation ? { rotation } : {}),
        children: [],
    })

    if(parent !== null)
        nodes[parent].children.push(index)

    return index
}

function box(name, parent, position, size, material)
{
    return addNode(name, parent, addMesh(name, cube, material), position, size)
}

// The game uses X for front/back, Y for height and Z for left/right.
const root = addNode('vehicleRoot', null)

// Keep the detachable antenna head before the chassis in traversal order.
const antennaHead = addNode('antennaHead', root)
addNode(
    'antennaHeadAxle',
    antennaHead,
    addMesh('antennaHeadAxle', cylinder, dark),
    [ 0, 0, 0 ],
    [ 0.13, 0.13, 0.08 ],
)

const chassis = addNode('chassis', root)

// Low-poly SU7 body in elegant grey.
box('bodyPainted', chassis, [ 0, 0.63, 0 ], [ 4.55, 0.48, 1.82 ], grey)
box('bodyPaintedShoulder', chassis, [ -0.12, 0.95, 0 ], [ 3.70, 0.32, 1.70 ], grey)
box('bodyPaintedHood', chassis, [ 1.42, 1.08, 0 ], [ 1.55, 0.18, 1.66 ], grey)
box('bodyPaintedDuckTail', chassis, [ -2.05, 1.10, 0 ], [ 0.30, 0.12, 1.52 ], grey)
box('glass', chassis, [ -0.40, 1.34, 0 ], [ 2.15, 0.52, 1.40 ], glass)

// Lighting keeps the original interactive behaviour.
box('headlights', chassis, [ 2.20, 0.96, -0.60 ], [ 0.10, 0.12, 0.36 ], white)
box('headlightsRight', chassis, [ 2.20, 0.96, 0.60 ], [ 0.10, 0.12, 0.36 ], white)
box('backLights', chassis, [ -2.28, 1.02, 0 ], [ 0.08, 0.10, 1.46 ], red)
box('stopLights', chassis, [ -2.29, 1.02, 0 ], [ 0.06, 0.10, 1.46 ], red)
box('blinkerLeft', chassis, [ -2.30, 1.01, -0.77 ], [ 0.06, 0.10, 0.10 ], amber)
box('blinkerRight', chassis, [ -2.30, 1.01, 0.77 ], [ 0.06, 0.10, 0.10 ], amber)

// One wheel rig is cloned four times by VisualVehicle.
const wheelContainer = addNode('wheelContainer', chassis)
const wheelSuspension = addNode('wheelSuspension', wheelContainer)
addNode(
    'wheelCylinder',
    wheelSuspension,
    addMesh('wheelCylinder', cylinder, dark),
    [ 0, 0, 0 ],
    [ 0.43, 0.43, 0.24 ],
)
addNode(
    'wheelPainted',
    wheelSuspension,
    addMesh('wheelPainted', cylinder, grey),
    [ 0, 0, 0 ],
    [ 0.30, 0.30, 0.255 ],
)

// Preserve the original boost animation with a renderable energy core and cells.
const energyModule = addNode('energyModule', chassis, null, [ -1.45, 0.68, 0 ])
box('energy', energyModule, [ 0, 0.08, 0 ], [ 0.92, 0.18, 0.58 ], purple)
box('cell1', energyModule, [ -0.28, 0.20, 0 ], [ 0.18, 0.22, 0.18 ], purple)
box('cell2', energyModule, [ 0, 0.20, 0 ], [ 0.18, 0.22, 0.18 ], purple)
box('cell3', energyModule, [ 0.28, 0.20, 0 ], [ 0.18, 0.22, 0.18 ], purple)

// Preserve the original rotating antenna feature as a stylised roof beacon.
const antenna = addNode('antenna', chassis, null, [ -0.72, 1.58, 0 ])
box('roofBeaconStem', antenna, [ 0, 0.08, 0 ], [ 0.05, 0.16, 0.05 ], dark)
addNode('antennaHeadReference', antenna, null, [ 0, 0.22, 0 ])

for(const node of nodes)
{
    if(node.children.length === 0)
        delete node.children
}

const binary = Buffer.concat(chunks)
const json = {
    asset: { version: '2.0', generator: 'folio-2025 SU7 full-rig generator' },
    scene: 0,
    scenes: [ { nodes: [ root ] } ],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [ { byteLength: binary.length } ],
}

let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
jsonBuffer = Buffer.concat([
    jsonBuffer,
    Buffer.alloc(align4(jsonBuffer.length) - jsonBuffer.length, 0x20),
])

const binBuffer = Buffer.concat([
    binary,
    Buffer.alloc(align4(binary.length) - binary.length),
])

const header = Buffer.alloc(12)
header.write('glTF', 0)
header.writeUInt32LE(2, 4)
header.writeUInt32LE(12 + 8 + jsonBuffer.length + 8 + binBuffer.length, 8)

const jsonHeader = Buffer.alloc(8)
jsonHeader.writeUInt32LE(jsonBuffer.length, 0)
jsonHeader.writeUInt32LE(0x4E4F534A, 4)

const binHeader = Buffer.alloc(8)
binHeader.writeUInt32LE(binBuffer.length, 0)
binHeader.writeUInt32LE(0x004E4942, 4)

const glb = Buffer.concat([ header, jsonHeader, jsonBuffer, binHeader, binBuffer ])
const outputDirectory = new URL('../../static/vehicle/', import.meta.url)
await mkdir(outputDirectory, { recursive: true })
await writeFile(new URL('su7.glb', outputDirectory), glb)
await writeFile(new URL('su7-compressed.glb', outputDirectory), glb)
console.log(`Generated complete SU7 GLB assets (${glb.byteLength} bytes each)`)
