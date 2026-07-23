import { readFile, stat } from 'node:fs/promises'

const paths = [
    new URL('../../static/vehicle/su7.glb', import.meta.url),
    new URL('../../static/vehicle/su7-compressed.glb', import.meta.url),
]

const requiredNames = [
    'chassis',
    'bodyPainted',
    'glass',
    'headlights',
    'headlightsRight',
    'wheelContainer',
    'wheelSuspension',
    'wheelCylinder',
    'wheelPainted',
    'antenna',
    'antennaHeadReference',
    'antennaHead',
    'antennaHeadAxle',
    'energy',
    'cell1',
    'cell2',
    'cell3',
]

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

function nodeByName(json, name)
{
    const index = json.nodes.findIndex(node => node.name === name)
    if(index === -1)
        throw new Error(`Missing node ${name}`)
    return { index, node: json.nodes[index] }
}

function positionAccessor(json, name)
{
    const { node } = nodeByName(json, name)
    const primitive = json.meshes?.[node.mesh]?.primitives?.[0]
    const accessor = json.accessors?.[primitive?.attributes?.POSITION]
    if(typeof node.mesh !== 'number' || typeof primitive?.material !== 'number' || !accessor)
        throw new Error(`${name} must be a renderable mesh with POSITION geometry and a material`)
    return accessor
}

for(const path of paths)
{
    const info = await stat(path)
    if(info.size >= 5 * 1024 * 1024)
        throw new Error(`${path.pathname} exceeds 5 MiB: ${info.size}`)

    const json = readJsonChunk(await readFile(path))
    for(const name of requiredNames)
        nodeByName(json, name)

    const body = positionAccessor(json, 'bodyPainted')
    const bodyLength = body.max[0] - body.min[0]
    const bodyHeight = body.max[1] - body.min[1]
    const bodyWidth = body.max[2] - body.min[2]
    if(!(bodyLength > bodyWidth && bodyWidth > bodyHeight))
        throw new Error('SU7 body axes must be X length, Y height and Z width')
    if(body.count < 40)
        throw new Error(`SU7 body must be sculpted, found only ${body.count} vertices`)

    if(positionAccessor(json, 'glass').count < 24)
        throw new Error('SU7 glass must follow a multi-section fastback roofline')
    if(positionAccessor(json, 'headlights').count < 12 || positionAccessor(json, 'headlightsRight').count < 12)
        throw new Error('SU7 headlights must use shaped waterdrop meshes')

    const { node: antenna } = nodeByName(json, 'antenna')
    const { index: referenceIndex } = nodeByName(json, 'antennaHeadReference')
    const { node: antennaHead } = nodeByName(json, 'antennaHead')
    const { index: axleIndex } = nodeByName(json, 'antennaHeadAxle')
    if(!antenna.children?.includes(referenceIndex))
        throw new Error('antenna must contain antennaHeadReference')
    if(!antennaHead.children?.includes(axleIndex))
        throw new Error('antennaHead must contain antennaHeadAxle')

    for(const name of [ 'energy', 'cell1', 'cell2', 'cell3', 'antennaHeadAxle' ])
        positionAccessor(json, name)

    const { node: wheel } = nodeByName(json, 'wheelCylinder')
    if(wheel.rotation)
        throw new Error('wheelCylinder must stay aligned to the Z axle')

    if((json.materials?.length ?? 0) > 8)
        throw new Error(`${path.pathname} has too many materials: ${json.materials.length}`)

    console.log(`${path.pathname}: ${info.size} bytes, ${json.nodes.length} nodes, ${json.materials?.length ?? 0} materials`)
}