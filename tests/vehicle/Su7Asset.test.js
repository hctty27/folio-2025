import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

function readJsonChunk(buffer)
{
    assert.equal(buffer.toString('ascii', 0, 4), 'glTF')

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
    assert.notEqual(index, -1, `Missing node ${name}`)
    return { index, node: json.nodes[index] }
}

const json = readJsonChunk(await readFile(new URL('../../static/vehicle/su7.glb', import.meta.url)))

test('SU7 uses the game axis convention', () =>
{
    const { node: body } = nodeByName(json, 'bodyPainted')
    assert.ok(body.scale[0] > body.scale[2], 'vehicle length must be on X')
    assert.ok(body.scale[2] > body.scale[1], 'vehicle width must be on Z and height on Y')
    assert.ok(body.translation[1] > 0, 'body height must be represented on Y')
    assert.equal(body.translation[2], 0, 'body must be centred laterally on Z')
})

test('SU7 provides a complete antenna rig', () =>
{
    const { node: antenna } = nodeByName(json, 'antenna')
    const { index: referenceIndex } = nodeByName(json, 'antennaHeadReference')
    const { node: head } = nodeByName(json, 'antennaHead')
    const { index: axleIndex, node: axle } = nodeByName(json, 'antennaHeadAxle')

    assert.ok(antenna.children?.includes(referenceIndex), 'antenna must contain antennaHeadReference')
    assert.ok(head.children?.includes(axleIndex), 'antennaHead must contain an axle')
    assert.equal(typeof axle.mesh, 'number', 'antenna axle must be renderable')
})

test('SU7 provides renderable energy cells for the original boost animation', () =>
{
    for(const name of [ 'energy', 'cell1', 'cell2', 'cell3' ])
    {
        const { node } = nodeByName(json, name)
        assert.equal(typeof node.mesh, 'number', `${name} must be a Mesh node`)
        const primitive = json.meshes[node.mesh]?.primitives?.[0]
        assert.equal(typeof primitive?.material, 'number', `${name} must reference a material`)
    }
})

test('SU7 wheel geometry is aligned to the Z axle', () =>
{
    const { node: wheel } = nodeByName(json, 'wheelCylinder')
    assert.equal(wheel.rotation, undefined, 'wheel cylinder must not be rotated away from the Z axle')
    assert.ok(wheel.scale[0] > wheel.scale[2], 'wheel radius must exceed half tyre width')
    assert.equal(wheel.scale[0], wheel.scale[1], 'wheel radius must be equal on X and Y')
})
