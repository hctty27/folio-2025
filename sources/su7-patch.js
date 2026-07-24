import * as THREE from 'three/webgpu'
import { ResourcesLoader } from './Game/ResourcesLoader.js'
import { PhysicsVehicle } from './Game/Physics/PhysicsVehicle.js'
import { VisualVehicle } from './Game/World/VisualVehicle.js'

const SU7_MODEL_URL = 'vehicle/su7-real-web.glb?cb=su7-real-v1'

// Load the user-approved SU7 asset regardless of compressed texture mode.
const originalLoad = ResourcesLoader.prototype.load
ResourcesLoader.prototype.load = function(files, progressCallback = null)
{
    const patchedFiles = files.map((file) =>
    {
        if(file[0] !== 'vehicle')
            return file

        const patchedFile = [ ...file ]
        patchedFile[1] = SU7_MODEL_URL
        return patchedFile
    })

    return originalLoad.call(this, patchedFiles, progressCallback)
}

// Match the physical body to the longer and wider SU7 silhouette.
PhysicsVehicle.prototype.setChassis = function()
{
    this.chassis = {}
    const object = this.game.objects.add(null, {
        type: 'dynamic',
        position: this.position,
        friction: 0.4,
        rotation: new THREE.Quaternion().setFromAxisAngle(new THREE.Euler(0, 1, 0), 0),
        colliders: [
            { shape: 'cuboid', mass: 2.5, parameters: [ 2.05, 0.38, 0.86 ], position: { x: 0, y: -0.12, z: 0 }, centerOfMass: { x: 0, y: -0.5, z: 0 } },
            { shape: 'cuboid', mass: 0, parameters: [ 1.05, 0.20, 0.72 ], position: { x: -0.10, y: 0.28, z: 0 } },
            { shape: 'cuboid', mass: 0, parameters: [ 2.18, 0.45, 0.96 ], position: { x: 0, y: -0.20, z: 0 }, category: 'bumper' },
        ],
        canSleep: false,
        waterGravityMultiplier: 0,
        onCollision: (force, position) =>
        {
            this.game.audio.groups.get('hitDefault').playRandomNext(force, position)
        }
    })

    this.chassis.physical = object.physical
    this.chassis.mass = this.chassis.physical.body.mass()
}

// Keep the existing suspension implementation, but use the SU7 wheel centres and tyre radius.
const originalSetWheels = PhysicsVehicle.prototype.setWheels
PhysicsVehicle.prototype.setWheels = function()
{
    originalSetWheels.call(this)

    this.wheels.settings.offset.x = 1.317
    this.wheels.settings.offset.y = 0
    this.wheels.settings.offset.z = 0.755
    this.wheels.settings.radius = 0.31
    this.wheels.updateSettings()
}

// Move the boost trails to the SU7 rear bumper.
const originalSetBoostTrails = VisualVehicle.prototype.setBoostTrails
VisualVehicle.prototype.setBoostTrails = function()
{
    originalSetBoostTrails.call(this)

    this.boostTrails.leftReference.position.set(-2.05, 0.08, -0.62)
    this.boostTrails.rightReference.position.set(-2.05, 0.08, 0.62)
}
