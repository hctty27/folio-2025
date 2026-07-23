import test from 'node:test'
import assert from 'node:assert/strict'
import { validateVehicleModel, selectVehicleModel } from '../../sources/Game/Vehicle/VehicleModelContract.js'

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
