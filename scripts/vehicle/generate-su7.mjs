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

function addMaterial(name, color, metallic = 0, roughness = 0.7, emissive = null, options = {})
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
        ...(options.alphaMode ? { alphaMode: options.alphaMode } : {}),
        doubleSided: options.doubleSided ?? false,
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

function cylinderGeometry(segments = 20)
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

function loftGeometry(sections)
{
    const positions = []
    const indices = []
    const ringSize = 8

    for(const section of sections)
    {
        const { x, lower, upper, halfWidth } = section
        const lowerCorner = lower + Math.min(0.10, (upper - lower) * 0.24)
        const upperCorner = upper - Math.min(0.12, (upper - lower) * 0.28)
        const shoulder = halfWidth * 0.58

        positions.push(
            x, lower, -shoulder,
            x, lowerCorner, -halfWidth,
            x, upperCorner, -halfWidth,
            x, upper, -shoulder,
            x, upper, shoulder,
            x, upperCorner, halfWidth,
            x, lowerCorner, halfWidth,
            x, lower, shoulder,
        )
    }

    for(let section = 0; section < sections.length - 1; section++)
    {
        const current = section * ringSize
        const next = current + ringSize
        for(let point = 0; point < ringSize; point++)
        {
            const following = (point + 1) % ringSize
            indices.push(
                current + point, next + point, next + following,
                current + point, next + following, current + following,
            )
        }
    }

    for(let point = 1; point < ringSize - 1; point++)
        indices.push(0, point + 1, point)

    const last = (sections.length - 1) * ringSize
    for(let point = 1; point < ringSize - 1; point++)
        indices.push(last, last + point, last + point + 1)

    return geometryAccessors(positions, indices)
}

function extrudedPolygonZ(points, halfDepth)
{
    const positions = []
    const indices = []

    for(const z of [ -halfDepth, halfDepth ])
    {
        for(const [ x, y ] of points)
            positions.push(x, y, z)
    }

    const count = points.length
    for(let point = 1; point < count - 1; point++)
    {
        indices.push(0, point + 1, point)
        indices.push(count, count + point, count + point + 1)
    }

    for(let point = 0; point < count; point++)
    {
        const next = (point + 1) % count
        indices.push(point, next, count + next, point, count + next, count + point)
    }

    return geometryAccessors(positions, indices)
}

function ribbonGeometryX(points, width, depth)
{
    const positions = []
    const indices = []

    for(let segment = 0; segment < points.length - 1; segment++)
    {
        const [ y0, z0 ] = points[segment]
        const [ y1, z1 ] = points[segment + 1]
        const dy = y1 - y0
        const dz = z1 - z0
        const length = Math.hypot(dy, dz)
        const py = -dz / length * width * 0.5
        const pz = dy / length * width * 0.5
        const x0 = -depth * 0.5
        const x1 = depth * 0.5
        const base = positions.length / 3

        positions.push(
            x0, y0 + py, z0 + pz,
            x0, y1 + py, z1 + pz,
            x0, y1 - py, z1 - pz,
            x0, y0 - py, z0 - pz,
            x1, y0 + py, z0 + pz,
            x1, y1 + py, z1 + pz,
            x1, y1 - py, z1 - pz,
            x1, y0 - py, z0 - pz,
        )

        indices.push(
            base, base + 1, base + 2, base, base + 2, base + 3,
            base + 4, base + 6, base + 5, base + 4, base + 7, base + 6,
            base, base + 4, base + 5, base, base + 5, base + 1,
            base + 1, base + 5, base + 6, base + 1, base + 6, base + 2,
            base + 2, base + 6, base + 7, base + 2, base + 7, base + 3,
            base + 3, base + 7, base + 4, base + 3, base + 4, base,
        )
    }

    return geometryAccessors(positions, indices)
}

function aeroDiscGeometry(segments = 20)
{
    const positions = []
    const indices = []
    const halfDepth = 0.18

    for(const z of [ -halfDepth, halfDepth ])
    {
        for(let segment = 0; segment < segments; segment++)
        {
            const angle = segment / segments * Math.PI * 2
            const radius = segment % 2 === 0 ? 1 : 0.78
            positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, z)
        }
    }

    const frontCenter = positions.length / 3
    positions.push(0, 0, -halfDepth)
    const backCenter = positions.length / 3
    positions.push(0, 0, halfDepth)

    for(let segment = 0; segment < segments; segment++)
    {
        const next = (segment + 1) % segments
        indices.push(
            frontCenter, next, segment,
            backCenter, segments + segment, segments + next,
            segment, next, segments + next,
            segment, segments + next, segments + segment,
        )
    }

    return geometryAccessors(positions, indices)
}

const cylinder = cylinderGeometry()
const aeroDisc = aeroDiscGeometry()
const bodyGeometry = loftGeometry([
    { x: -2.48, lower: -0.39, upper: 0.10, halfWidth: 0.58 },
    { x: -2.30, lower: -0.43, upper: 0.27, halfWidth: 0.82 },
    { x: -1.82, lower: -0.44, upper: 0.37, halfWidth: 0.94 },
    { x: -1.25, lower: -0.44, upper: 0.43, halfWidth: 0.98 },
    { x: -0.35, lower: -0.44, upper: 0.46, halfWidth: 0.99 },
    { x:  0.65, lower: -0.44, upper: 0.44, halfWidth: 0.98 },
    { x:  1.45, lower: -0.43, upper: 0.36, halfWidth: 0.94 },
    { x:  2.05, lower: -0.40, upper: 0.26, halfWidth: 0.84 },
    { x:  2.38, lower: -0.33, upper: 0.12, halfWidth: 0.62 },
    { x:  2.50, lower: -0.24, upper: 0.02, halfWidth: 0.38 },
])
const canopyGeometry = loftGeometry([
    { x: -1.52, lower: 0.25, upper: 0.34, halfWidth: 0.72 },
    { x: -1.18, lower: 0.27, upper: 0.61, halfWidth: 0.70 },
    { x: -0.62, lower: 0.29, upper: 0.87, halfWidth: 0.67 },
    { x:  0.08, lower: 0.30, upper: 0.96, halfWidth: 0.63 },
    { x:  0.70, lower: 0.29, upper: 0.85, halfWidth: 0.65 },
    { x:  1.17, lower: 0.27, upper: 0.56, halfWidth: 0.69 },
    { x:  1.43, lower: 0.25, upper: 0.31, halfWidth: 0.72 },
])
const headlightGeometry = extrudedPolygonZ([
    [ 1.97, 0.12 ],
    [ 2.15, 0.27 ],
    [ 2.45, 0.25 ],
    [ 2.39, 0.12 ],
    [ 2.22, 0.03 ],
    [ 2.03, 0.05 ],
], 0.11)
const ducktailGeometry = extrudedPolygonZ([
    [ -2.34, 0.35 ],
    [ -1.88, 0.35 ],
    [ -1.98, 0.47 ],
    [ -2.40, 0.48 ],
    [ -2.48, 0.42 ],
], 0.76)
const frontIntakeGeometry = extrudedPolygonZ([
    [ 2.24, -0.27 ],
    [ 2.49, -0.19 ],
    [ 2.43, -0.04 ],
    [ 2.16, -0.10 ],
], 0.50)
const haloTailGeometry = ribbonGeometryX([
    [ 0.15, -0.78 ],
    [ 0.23, -0.64 ],
    [ 0.28, -0.34 ],
    [ 0.30,  0.00 ],
    [ 0.28,  0.34 ],
    [ 0.23,  0.64 ],
    [ 0.15,  0.78 ],
], 0.075, 0.07)

const grey = addMaterial('雅灰', [ 0.30, 0.32, 0.33, 1 ], 0.42, 0.48)
const dark = addMaterial('轮胎', [ 0.025, 0.03, 0.035, 1 ], 0.05, 0.82)
const glass = addMaterial('玻璃', [ 0.025, 0.055, 0.07, 0.82 ], 0.08, 0.16, null, { alphaMode: 'BLEND', doubleSided: true })
const white = addMaterial('前灯', [ 1, 1, 1, 1 ], 0, 0.22, [ 1, 1, 1 ])
const red = addMaterial('尾灯', [ 1, 0.015, 0.01, 1 ], 0, 0.24, [ 1, 0.015, 0.01 ])
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

// The original gameplay detaches and animates this head independently.
const antennaHead = addNode('antennaHead', root)
addNode('antennaHeadAxle', antennaHead, addMesh('antennaHeadAxle', cylinder, dark), [ 0, 0, 0 ], [ 0.13, 0.13, 0.08 ])

const chassis = addNode('chassis', root)

// Recognisable SU7 proportions: low nose, broad shoulders and a long smooth fastback.
addNode('bodyPainted', chassis, addMesh('bodyPainted', bodyGeometry, grey))
addNode('glass', chassis, addMesh('glass', canopyGeometry, glass))
addNode('bodyPaintedDuckTail', chassis, addMesh('bodyPaintedDuckTail', ducktailGeometry, grey))
box('bodyPaintedMirrorLeft', chassis, [ 0.72, 0.37, -0.94 ], [ 0.18, 0.10, 0.16 ], grey)
box('bodyPaintedMirrorRight', chassis, [ 0.72, 0.37, 0.94 ], [ 0.18, 0.10, 0.16 ], grey)
addNode('frontIntake', chassis, addMesh('frontIntake', frontIntakeGeometry, dark))

// Waterdrop headlights and a curved halo rear light are the key SU7 signatures.
addNode('headlights', chassis, addMesh('headlights', headlightGeometry, white), [ 0, 0, -0.67 ])
addNode('headlightsRight', chassis, addMesh('headlightsRight', headlightGeometry, white), [ 0, 0, 0.67 ])
addNode('backLights', chassis, addMesh('backLights', haloTailGeometry, red), [ -2.43, 0, 0 ])
addNode('stopLights', chassis, addMesh('stopLights', haloTailGeometry, red), [ -2.45, 0, 0 ])
box('blinkerLeft', chassis, [ -2.37, 0.17, -0.83 ], [ 0.08, 0.08, 0.12 ], amber)
box('blinkerRight', chassis, [ -2.37, 0.17, 0.83 ], [ 0.08, 0.08, 0.12 ], amber)

// One wheel rig is cloned four times. The star-disc reads as the 19-inch aero wheel at low polygon count.
const wheelContainer = addNode('wheelContainer', chassis)
const wheelSuspension = addNode('wheelSuspension', wheelContainer)
addNode('wheelCylinder', wheelSuspension, addMesh('wheelCylinder', cylinder, dark), [ 0, 0, 0 ], [ 0.43, 0.43, 0.24 ])
addNode('wheelPainted', wheelSuspension, addMesh('wheelPainted', aeroDisc, grey), [ 0, 0, 0 ], [ 0.31, 0.31, 0.18 ])

// Preserve the original boost animation with renderable meshes.
const energyModule = addNode('energyModule', chassis, null, [ -1.45, -0.20, 0 ])
box('energy', energyModule, [ 0, 0.08, 0 ], [ 0.92, 0.18, 0.58 ], purple)
box('cell1', energyModule, [ -0.28, 0.20, 0 ], [ 0.18, 0.22, 0.18 ], purple)
box('cell2', energyModule, [ 0, 0.20, 0 ], [ 0.18, 0.22, 0.18 ], purple)
box('cell3', energyModule, [ 0.28, 0.20, 0 ], [ 0.18, 0.22, 0.18 ], purple)

// Preserve the original rotating antenna feature as a small roof beacon.
const antenna = addNode('antenna', chassis, null, [ -0.72, 1.00, 0 ])
box('roofBeaconStem', antenna, [ 0, 0.07, 0 ], [ 0.05, 0.14, 0.05 ], dark)
addNode('antennaHeadReference', antenna, null, [ 0, 0.18, 0 ])

for(const node of nodes)
{
    if(node.children.length === 0)
        delete node.children
}

const binary = Buffer.concat(chunks)
const json = {
    asset: {
        version: '2.0',
        generator: 'folio-2025 recognisable low-poly Xiaomi SU7 generator',
        extras: {
            vehicle: 'Xiaomi SU7 Pro 2024',
            style: 'recognisable-low-poly',
            dimensionsMillimetres: [ 4997, 1440, 1963 ],
            wheelbaseMillimetres: 3000,
        },
    },
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
console.log(`Generated recognisable SU7 GLB assets (${glb.byteLength} bytes each)`)