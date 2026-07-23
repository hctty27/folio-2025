import { readFile, writeFile } from 'node:fs/promises'

function replaceOnce(source, search, replacement, label)
{
    const index = source.indexOf(search)
    if(index === -1)
        throw new Error(`Integration target not found: ${label}`)
    if(source.indexOf(search, index + search.length) !== -1)
        throw new Error(`Integration target is not unique: ${label}`)
    return source.slice(0, index) + replacement + source.slice(index + search.length)
}

function replaceRegexOnce(source, expression, replacement, label)
{
    const matches = [ ...source.matchAll(new RegExp(expression.source, expression.flags.includes('g') ? expression.flags : `${expression.flags}g`)) ]
    if(matches.length !== 1)
        throw new Error(`Expected one integration target for ${label}, found ${matches.length}`)
    return source.replace(expression, replacement)
}

async function update(path, transform)
{
    const before = await readFile(path, 'utf8')
    const after = transform(before)
    if(after === before)
        throw new Error(`Integration made no changes to ${path}`)
    await writeFile(path, after)
    console.log(`Updated ${path}`)
}

await update('package.json', (source) =>
{
    const value = JSON.parse(source)
    value.scripts['vehicle:generate'] = 'node scripts/vehicle/generate-su7.mjs'
    value.scripts['vehicle:inspect'] = 'node scripts/vehicle/inspect-su7.mjs'
    return `${JSON.stringify(value, null, 2)}\n`
})

await update('sources/Game/ResourcesLoader.js', (source) =>
{
    source = replaceOnce(
        source,
        "                if(typeof _file[3] !== 'undefined')\n                    _file[3](_resource)",
        "                if(typeof _file[3] === 'function')\n                    _file[3](_resource)",
        'resource modifier guard',
    )

    source = replaceOnce(
        source,
        "            const error = (_file) =>\n            {\n                console.log(`Resources > Couldn't load file ${_file[1]}`)\n                reject(_file[1])\n            }",
        "            const error = (_file) =>\n            {\n                const options = _file[4] ?? {}\n                if(options.optional)\n                {\n                    console.warn(`Resources > Optional file unavailable ${_file[1]}`)\n                    loadedResources[_file[0]] = null\n                    progress()\n                    return\n                }\n\n                console.log(`Resources > Couldn't load file ${_file[1]}`)\n                reject(_file[1])\n            }",
        'optional resource error handling',
    )

    source = replaceOnce(source, "                        error\n                    )", "                        () => error(_file)\n                    )", 'loader error closure')
    return source
})

await update('sources/Game/Game.js', (source) =>
{
    source = replaceOnce(
        source,
        "import { Map } from './Map.js'",
        "import { Map } from './Map.js'\nimport { SuspensionMode } from './Vehicle/SuspensionMode.js'\nimport { selectVehicleModel } from './Vehicle/VehicleModelContract.js'\nimport { getVehicleProfile } from './Vehicle/VehicleProfiles.js'",
        'vehicle imports',
    )

    source = replaceOnce(
        source,
        "        this.notifications = new Notifications()\n        this.rayCursor = new RayCursor()",
        "        this.notifications = new Notifications()\n        this.suspensionMode = new SuspensionMode({ inputs: this.inputs, notifications: this.notifications })\n        this.rayCursor = new RayCursor()",
        'suspension mode initialization',
    )

    source = replaceRegexOnce(
        source,
        /\[ 'vehicle',\s+`vehicle\/default\$\{compressedModelSuffix\}\.glb\$\{cb\}`,\s+'gltf' \],/,
        "[ 'vehicleSu7',                           `vehicle/su7${compressedModelSuffix}.glb${cb}`,                                       'gltf', null, { optional: true } ],\n                [ 'vehicleFallback',                      `vehicle/default${compressedModelSuffix}.glb${cb}`,                                   'gltf' ],",
        'vehicle resources',
    )

    source = replaceOnce(
        source,
        "        this.resources = { ...newResources, ...this.resources }\n\n        this.terrain = new Terrain()",
        "        this.resources = { ...newResources, ...this.resources }\n        this.vehicleSelection = selectVehicleModel(this.resources.vehicleSu7?.scene ?? null, this.resources.vehicleFallback.scene)\n        this.vehicleProfile = getVehicleProfile(this.vehicleSelection.source)\n        this.resources.vehicle = { scene: this.vehicleSelection.model }\n        this.view.applyVehicleProfile(this.vehicleProfile)\n\n        this.terrain = new Terrain()",
        'vehicle selection',
    )

    source = replaceOnce(source, '        this.physicalVehicle = new PhysicsVehicle()', '        this.physicalVehicle = new PhysicsVehicle(this.vehicleProfile)', 'physics profile injection')
    return source
})

await update('sources/Game/World/World.js', (source) =>
{
    return replaceOnce(
        source,
        '            this.visualVehicle = new VisualVehicle(this.game.resources.vehicle.scene)',
        "            this.vehicleSource = this.game.vehicleSelection.source\n            this.visualVehicle = new VisualVehicle(this.game.vehicleSelection.model)",
        'visual vehicle selection',
    )
})

await update('sources/Game/Physics/PhysicsVehicle.js', (source) =>
{
    source = replaceOnce(
        source,
        "import { lerp, remap, remapClamp, smallestAngle } from '../utilities/maths.js'",
        "import { lerp, remap, remapClamp, smallestAngle } from '../utilities/maths.js'\nimport { getSuspensionProfile } from '../Vehicle/VehicleProfiles.js'",
        'physics profile import',
    )
    source = replaceOnce(source, '    constructor()\n    {\n        this.game = Game.getInstance()', "    constructor(profile = null)\n    {\n        this.game = Game.getInstance()\n        this.profile = profile ?? this.game.vehicleProfile\n        this.suspensionProfile = getSuspensionProfile(this.game.suspensionMode.current)", 'physics constructor')
    source = replaceRegexOnce(
        source,
        /        this\.suspensionsHeights = \{[\s\S]*?        this\.suspensionsStiffness = \{[\s\S]*?        \}/,
        "        this.suspensionsHeights = { ...this.suspensionProfile.heights }\n        this.suspensionsStiffness = { ...this.suspensionProfile.stiffness }",
        'initial suspension maps',
    )
    source = replaceRegexOnce(
        source,
        /            colliders: \[\n                \{ shape: 'cuboid', mass: 2\.5,[\s\S]*?            \],/,
        "            colliders: this.profile.colliders.map((collider) => ({\n                ...collider,\n                parameters: [ ...collider.parameters ],\n                position: { ...collider.position },\n                ...(collider.centerOfMass ? { centerOfMass: { ...collider.centerOfMass } } : {}),\n            })),",
        'vehicle colliders',
    )
    source = replaceOnce(source, "            offset: { x: 0.90, y: 0, z: 0.75 },\n            radius: 0.4,", "            offset: { ...this.profile.wheels.offset },\n            radius: this.profile.wheels.radius,", 'wheel geometry')
    source = replaceOnce(source, "            maxSuspensionForce: 150,\n            maxSuspensionTravel: 2,\n            sideFrictionStiffness: 3,\n            suspensionCompression: 10,\n            suspensionRelaxation: 2.7,", "            maxSuspensionForce: this.suspensionProfile.maxSuspensionForce,\n            maxSuspensionTravel: this.suspensionProfile.maxSuspensionTravel,\n            sideFrictionStiffness: this.suspensionProfile.sideFrictionStiffness,\n            suspensionCompression: this.suspensionProfile.suspensionCompression,\n            suspensionRelaxation: this.suspensionProfile.suspensionRelaxation,", 'suspension controller settings')
    source = replaceOnce(
        source,
        "        this.setWheels()\n        this.setStop()",
        "        this.setWheels()\n        this.game.suspensionMode.events.on('change', (mode) => this.applySuspensionProfile(mode))\n        this.setStop()",
        'suspension change listener',
    )
    source = replaceOnce(
        source,
        '    setStop()\n    {',
        "    applySuspensionProfile(mode)\n    {\n        this.suspensionProfile = getSuspensionProfile(mode)\n        this.suspensionsHeights = { ...this.suspensionProfile.heights }\n        this.suspensionsStiffness = { ...this.suspensionProfile.stiffness }\n\n        Object.assign(this.wheels.settings, {\n            maxSuspensionForce: this.suspensionProfile.maxSuspensionForce,\n            maxSuspensionTravel: this.suspensionProfile.maxSuspensionTravel,\n            sideFrictionStiffness: this.suspensionProfile.sideFrictionStiffness,\n            suspensionCompression: this.suspensionProfile.suspensionCompression,\n            suspensionRelaxation: this.suspensionProfile.suspensionRelaxation,\n        })\n        this.wheels.updateSettings()\n    }\n\n    setStop()\n    {",
        'suspension profile application',
    )
    return source
})

await update('sources/Game/Player.js', (source) =>
{
    source = replaceOnce(
        source,
        "import { clamp } from 'three/src/math/MathUtils.js'",
        "import { clamp } from 'three/src/math/MathUtils.js'\nimport { getSuspensionProfile } from './Vehicle/VehicleProfiles.js'",
        'player suspension import',
    )
    source = replaceOnce(
        source,
        "            const activeState = this.game.inputs.actions.get('suspensions').active ? 'high' : 'mid' // high = jump, mid = lowride",
        "            const suspensionProfile = getSuspensionProfile(this.game.suspensionMode.current)\n            const activeState = this.game.inputs.actions.get('suspensions').active\n                ? suspensionProfile.allWheelsActiveState\n                : suspensionProfile.partialActiveState",
        'mode-aware suspension input',
    )
    source = replaceOnce(
        source,
        "            for(let i = 0; i < 4; i++)\n                this.suspensions[i] = 'high'",
        "            const suspensionProfile = getSuspensionProfile(this.game.suspensionMode.current)\n            for(let i = 0; i < 4; i++)\n                this.suspensions[i] = suspensionProfile.allWheelsActiveState",
        'touch suspension mode',
    )
    return source
})

await update('sources/Game/View.js', (source) =>
{
    return replaceOnce(
        source,
        '    toggleMode()\n    {',
        "    applyVehicleProfile(profile)\n    {\n        if(!profile?.camera)\n            return\n\n        this.spherical.radius.edges = { ...profile.camera.radiusEdges }\n        this.spherical.radius.nonIdealRatioOffset = profile.camera.nonIdealRatioOffset\n        this.optimalArea.needsUpdate = true\n    }\n\n    toggleMode()\n    {",
        'camera profile method',
    )
})

await update('sources/Game/World/VisualVehicle.js', (source) =>
{
    source = replaceOnce(
        source,
        "import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'",
        "import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'\nimport { VEHICLE_PROFILE } from '../Vehicle/VehicleProfiles.js'",
        'visual vehicle profile import',
    )
    source = replaceOnce(source, '        this.model = model\n\n        this.setParts()', "        this.model = model\n        this.profile = this.game.vehicleSelection.source === 'su7' ? VEHICLE_PROFILE : this.game.vehicleProfile\n\n        this.setParts()", 'visual vehicle profile')
    source = replaceOnce(source, "        this.boostTrails.leftReference.position.set(-1.28, 0.1, -0.55)", "        this.boostTrails.leftReference.position.set(\n            this.profile.effects.boostLeft.x,\n            this.profile.effects.boostLeft.y,\n            this.profile.effects.boostLeft.z,\n        )", 'left boost position')
    source = replaceOnce(source, "        this.boostTrails.rightReference.position.set(-1.28, 0.1, 0.55)", "        this.boostTrails.rightReference.position.set(\n            this.profile.effects.boostRight.x,\n            this.profile.effects.boostRight.y,\n            this.profile.effects.boostRight.z,\n        )", 'right boost position')
    return source
})

await update('sources/Game/Options.js', (source) =>
{
    source = replaceOnce(source, '        this.setQuality()\n        this.setRespawn()', '        this.setQuality()\n        this.setSuspensionMode()\n        this.setRespawn()', 'options constructor')
    source = replaceOnce(
        source,
        '    setRespawn()\n    {',
        "    setSuspensionMode()\n    {\n        const element = this.element.querySelector('.js-suspension-mode-toggle')\n        const text = element.querySelector('span')\n        const update = (mode) =>\n        {\n            text.textContent = mode === 'realistic' ? '写实' : '娱乐'\n        }\n\n        update(this.game.suspensionMode.current)\n        element.addEventListener('click', () => this.game.suspensionMode.toggle())\n        this.game.suspensionMode.events.on('change', update)\n    }\n\n    setRespawn()\n    {",
        'options suspension method',
    )
    return source
})

await update('sources/index.html', (source) =>
{
    const row = `                                        <tr>\n                                            <td>\n                                                Suspension mode\n                                            </td>\n                                            <td>\n                                                <button class="js-suspension-mode-toggle button is-small has-tooltip">\n                                                    <div class="tooltip">Press J to switch modes</div>\n                                                    <span>Realistic</span>\n                                                </button>\n                                            </td>\n                                        </tr>\n`
    return replaceOnce(source, '                                        <tr>\n                                            <td>\n                                                I\'m stuck!', `${row}                                        <tr>\n                                            <td>\n                                                I'm stuck!`, 'suspension options row')
})

await update('sources/i18n-zh.js', (source) =>
{
    source = replaceOnce(source, '    "Options": "设置",', '    "Options": "设置",\n    "Suspension mode": "悬架模式",\n    "Press J to switch modes": "按 J 键切换模式",\n    "Realistic": "写实",\n    "Fun": "娱乐",', 'suspension translations')
    source = replaceOnce(source, '    "Honk": "鸣笛",', '    "Honk": "鸣笛",\n    "Switch suspension mode": "切换悬架模式",', 'control translation')
    return source
})

console.log('SU7 integration patch completed')
