import test from 'node:test'
import assert from 'node:assert/strict'
import { SUSPENSION_MODES, VEHICLE_PROFILE, DEFAULT_VEHICLE_PROFILE, getSuspensionProfile, getVehicleProfile } from '../../sources/Game/Vehicle/VehicleProfiles.js'

test('SU7 profile exposes fixed dimensions and wheel geometry', () =>
{
    assert.deepEqual(VEHICLE_PROFILE.wheels.offset, { x: 1.35, y: 0, z: 0.76 })
    assert.equal(VEHICLE_PROFILE.wheels.radius, 0.43)
    assert.deepEqual(VEHICLE_PROFILE.camera.radiusEdges, { min: 17, max: 34 })
})

test('realistic and fun suspension profiles are complete and distinct', () =>
{
    const realistic = getSuspensionProfile(SUSPENSION_MODES.REALISTIC)
    const fun = getSuspensionProfile(SUSPENSION_MODES.FUN)
    for(const profile of [ realistic, fun ])
    {
        assert.deepEqual(Object.keys(profile.heights), [ 'low', 'mid', 'high' ])
        assert.deepEqual(Object.keys(profile.stiffness), [ 'low', 'mid', 'high' ])
        assert.ok(profile.maxSuspensionTravel > 0)
    }
    assert.ok(realistic.heights.high < fun.heights.high)
    assert.ok(realistic.maxSuspensionTravel < fun.maxSuspensionTravel)
})

test('unknown suspension mode and vehicle source fall back safely', () =>
{
    assert.equal(getSuspensionProfile('unknown'), getSuspensionProfile(SUSPENSION_MODES.REALISTIC))
    assert.equal(getVehicleProfile('su7'), VEHICLE_PROFILE)
    assert.equal(getVehicleProfile('unknown'), DEFAULT_VEHICLE_PROFILE)
})
