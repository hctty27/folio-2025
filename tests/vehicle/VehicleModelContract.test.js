import test from 'node:test'
import assert from 'node:assert/strict'
import * as vehicleContract from '../../sources/Game/Vehicle/VehicleModelContract.js'

const { validateVehicleModel, selectVehicleModel } = vehicleContract

function model(names)
{
    return { traverse(callback){ for(const name of names) callback({ name }) } }
}

const validNames = [ 'chassis', 'bodyPainted.001', 'wheelContainer', 'wheelSuspension', 'wheelCylinder.001', 'wheelPainted' ]

test('validates required nodes by prefix and reports optional nodes', () =>
{
    const result = validateVehicleModel(model([ ...validNames, 'backLights' ]))
    assert.equal(result.valid, true)
    assert.deepEqual(result.missingRequired, [])
    assert.deepEqual(result.availableOptional, [ 'backLights' ])
})

test('reports missing required nodes', () =>
{
    const result = validateVehicleModel(model([ 'chassis', 'bodyPainted' ]))
    assert.equal(result.valid, false)
    assert.ok(result.missingRequired.includes('wheelContainer'))
})

test('selects preferred model or falls back', () =>
{
    const preferred = model(validNames)
    const fallback = model(validNames)
    assert.equal(selectVehicleModel(preferred, fallback).source, 'su7')
    assert.equal(selectVehicleModel(model([ 'chassis' ]), fallback).source, 'fallback')
    assert.throws(() => selectVehicleModel(null, model([ 'chassis' ])), /Fallback vehicle model is invalid/)
})

test('ignores an incomplete optional antenna rig', () =>
{
    assert.equal(typeof vehicleContract.resolveAntennaRig, 'function')

    const scene = { getObjectByName: () => undefined }
    const antenna = { getObjectByName: () => undefined }

    assert.equal(vehicleContract.resolveAntennaRig(scene, antenna), null)
})

test('returns a complete antenna rig', () =>
{
    assert.equal(typeof vehicleContract.resolveAntennaRig, 'function')

    const axle = { name: 'antennaAxle' }
    const head = { name: 'antennaHead', children: [ axle ] }
    const reference = { name: 'antennaHeadReference' }
    const scene = { getObjectByName: name => name === 'antennaHead' ? head : undefined }
    const antenna = { getObjectByName: name => name === 'antennaHeadReference' ? reference : undefined }

    assert.deepEqual(vehicleContract.resolveAntennaRig(scene, antenna), {
        object: antenna,
        head,
        headAxle: axle,
        headReference: reference,
    })
})

test('removes an incomplete optional antenna before selecting the vehicle', () =>
{
    let removed = false
    const antenna = {
        name: 'antenna',
        getObjectByName: () => undefined,
        removeFromParent: () => { removed = true },
    }
    const preferred = {
        traverse(callback)
        {
            for(const name of validNames)
                callback({ name })
            callback(antenna)
        },
        getObjectByName(name)
        {
            return name === 'antenna' ? antenna : undefined
        },
    }

    assert.equal(selectVehicleModel(preferred, model(validNames)).source, 'su7')
    assert.equal(removed, true)
})
