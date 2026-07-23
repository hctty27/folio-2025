export const SUSPENSION_MODES = Object.freeze({
    REALISTIC: 'realistic',
    FUN: 'fun',
})

const suspensionProfiles = Object.freeze({
    [SUSPENSION_MODES.REALISTIC]: Object.freeze({
        heights: Object.freeze({ low: 0.82, mid: 0.94, high: 1.08 }),
        stiffness: Object.freeze({ low: 34, mid: 36, high: 38 }),
        maxSuspensionForce: 180,
        maxSuspensionTravel: 0.55,
        sideFrictionStiffness: 3.6,
        suspensionCompression: 12,
        suspensionRelaxation: 4.5,
        allWheelsActiveState: 'mid',
        partialActiveState: 'mid',
    }),
    [SUSPENSION_MODES.FUN]: Object.freeze({
        heights: Object.freeze({ low: 0.88, mid: 1.23, high: 1.63 }),
        stiffness: Object.freeze({ low: 20, mid: 30, high: 40 }),
        maxSuspensionForce: 150,
        maxSuspensionTravel: 2,
        sideFrictionStiffness: 3,
        suspensionCompression: 10,
        suspensionRelaxation: 2.7,
        allWheelsActiveState: 'high',
        partialActiveState: 'mid',
    }),
})

export const DEFAULT_VEHICLE_PROFILE = Object.freeze({
    name: 'default',
    colliders: Object.freeze([
        Object.freeze({ shape: 'cuboid', mass: 2.5, parameters: Object.freeze([ 1.3, 0.4, 0.85 ]), position: Object.freeze({ x: 0, y: -0.1, z: 0 }), centerOfMass: Object.freeze({ x: 0, y: -0.5, z: 0 }) }),
        Object.freeze({ shape: 'cuboid', mass: 0, parameters: Object.freeze([ 0.5, 0.15, 0.65 ]), position: Object.freeze({ x: 0, y: 0.4, z: 0 }) }),
        Object.freeze({ shape: 'cuboid', mass: 0, parameters: Object.freeze([ 1.5, 0.5, 0.9 ]), position: Object.freeze({ x: 0.1, y: -0.2, z: 0 }), category: 'bumper' }),
    ]),
    wheels: Object.freeze({ offset: Object.freeze({ x: 0.90, y: 0, z: 0.75 }), radius: 0.4 }),
    camera: Object.freeze({ radiusEdges: Object.freeze({ min: 15, max: 30 }), nonIdealRatioOffset: 9, focusHeight: 0 }),
    effects: Object.freeze({ boostLeft: Object.freeze({ x: -1.28, y: 0.1, z: -0.55 }), boostRight: Object.freeze({ x: -1.28, y: 0.1, z: 0.55 }) }),
})

export const VEHICLE_PROFILE = Object.freeze({
    name: 'xiaomi-su7-pro-2024',
    colliders: Object.freeze([
        Object.freeze({ shape: 'cuboid', mass: 2.8, parameters: Object.freeze([ 2.18, 0.34, 0.88 ]), position: Object.freeze({ x: 0, y: -0.12, z: 0 }), centerOfMass: Object.freeze({ x: -0.08, y: -0.58, z: 0 }) }),
        Object.freeze({ shape: 'cuboid', mass: 0, parameters: Object.freeze([ 0.98, 0.23, 0.70 ]), position: Object.freeze({ x: -0.28, y: 0.39, z: 0 }) }),
        Object.freeze({ shape: 'cuboid', mass: 0, parameters: Object.freeze([ 2.30, 0.46, 0.93 ]), position: Object.freeze({ x: 0, y: -0.18, z: 0 }), category: 'bumper' }),
    ]),
    wheels: Object.freeze({ offset: Object.freeze({ x: 1.35, y: 0, z: 0.76 }), radius: 0.43 }),
    camera: Object.freeze({ radiusEdges: Object.freeze({ min: 17, max: 34 }), nonIdealRatioOffset: 10, focusHeight: 0.35 }),
    effects: Object.freeze({ boostLeft: Object.freeze({ x: -2.12, y: 0.02, z: -0.56 }), boostRight: Object.freeze({ x: -2.12, y: 0.02, z: 0.56 }) }),
})

export function getSuspensionProfile(mode)
{
    return suspensionProfiles[mode] ?? suspensionProfiles[SUSPENSION_MODES.REALISTIC]
}

export function getVehicleProfile(source)
{
    return source === 'su7' ? VEHICLE_PROFILE : DEFAULT_VEHICLE_PROFILE
}
