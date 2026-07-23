# 小米 SU7 Pro 低多边形车辆 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将默认可驾驶车辆替换为雅灰低多边形 2024 小米 SU7 Pro，并新增可持久化的写实／娱乐双悬架模式；`J` 切换模式，`H` 保持鸣笛。

**Architecture:** 保留 `VisualVehicle`、`PhysicsVehicle` 和 `Player` 的现有职责。新增三个小模块：`SuspensionMode` 管理状态与输入，`VehicleProfiles` 集中管理 SU7 和悬架参数，`VehicleModelContract` 验证 GLB 节点并选择 SU7 或原车回退。SU7 与原车同时加载；SU7 加载失败或节点不完整时继续使用原车。

**Tech Stack:** JavaScript ES modules、Three.js 0.183、Rapier3D 0.17、Node.js 22、Node Test Runner、Vite 7、Blender glTF 2.0、gltf-transform CLI、Cloudflare Workers Static Assets。

## Global Constraints

- 设计基准：`docs/superpowers/specs/2026-07-23-xiaomi-su7-vehicle-design.md`。
- 开发必须在分支 `feat/xiaomi-su7-vehicle` 和独立 worktree 中进行，不直接在 `main` 实现。
- 不新增运行时 npm 依赖。
- 默认车型：2024 小米 SU7 Pro；低多边形卡通风格；雅灰；19 英寸低风阻轮毂。
- 悬架模式仅允许 `realistic`、`fun`；默认 `realistic`。
- 持久化键固定为 `vehicleSuspensionMode`。
- `J` 只切换悬架模式；`H` 继续只鸣笛。
- 必需节点按名称前缀匹配：`chassis`、`bodyPainted`、`wheelContainer`、`wheelSuspension`、`wheelCylinder`、`wheelPainted`。
- 可选节点按名称前缀匹配：`blinkerLeft`、`blinkerRight`、`stopLights`、`backLights`、`antenna`、`cell1`、`cell2`、`cell3`、`energy`。
- 原车 `static/vehicle/default.glb` 与 `static/vehicle/default-compressed.glb` 必须保留作为回退。
- SU7 压缩后 GLB 硬上限 5 MiB；所有静态文件必须小于 Cloudflare 的 25 MiB 单文件限制。
- 每个任务先写失败测试，再做最小实现，再独立提交。

---

## File Map

### Create

- `sources/Game/Vehicle/VehicleProfiles.js`
- `sources/Game/Vehicle/SuspensionMode.js`
- `sources/Game/Vehicle/VehicleModelContract.js`
- `tests/vehicle/VehicleProfiles.test.js`
- `tests/vehicle/SuspensionMode.test.js`
- `tests/vehicle/VehicleModelContract.test.js`
- `scripts/vehicle/generate-su7.py`
- `static/vehicle/su7.glb`
- `static/vehicle/su7-compressed.glb`

### Modify

- `package.json`
- `sources/Game/Game.js`
- `sources/Game/ResourcesLoader.js`
- `sources/Game/World/World.js`
- `sources/Game/World/VisualVehicle.js`
- `sources/Game/Physics/PhysicsVehicle.js`
- `sources/Game/Player.js`
- `sources/Game/View.js`
- `sources/Game/Options.js`
- `sources/index.html`
- `sources/i18n-zh.js`

---

### Task 1: Test Harness and Vehicle Profiles

**Files:**
- Create: `sources/Game/Vehicle/VehicleProfiles.js`
- Create: `tests/vehicle/VehicleProfiles.test.js`
- Modify: `package.json:8-13`

**Interfaces:**
- Produces: `SUSPENSION_MODES`, `VEHICLE_PROFILE`, `getSuspensionProfile(mode)`。
- Consumers: `SuspensionMode`、`PhysicsVehicle`、`Player`、`View`。

- [ ] **Step 1: Add test commands to `package.json`**

```json
{
  "scripts": {
    "dev": "vite --mode development",
    "build": "vite build --mode production",
    "preview": "vite preview",
    "test": "node --test tests",
    "test:vehicle": "node --test tests/vehicle",
    "compress": "node scripts/compress.js static/"
  }
}
```

- [ ] **Step 2: Write failing profile tests**

```js
// tests/vehicle/VehicleProfiles.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
    SUSPENSION_MODES,
    VEHICLE_PROFILE,
    getSuspensionProfile,
} from '../../sources/Game/Vehicle/VehicleProfiles.js'

test('SU7 wheel and camera profile is stable', () =>
{
    assert.deepEqual(VEHICLE_PROFILE.wheels.offset, { x: 1.35, y: 0, z: 0.76 })
    assert.equal(VEHICLE_PROFILE.wheels.radius, 0.43)
    assert.deepEqual(VEHICLE_PROFILE.camera.radiusEdges, { min: 17, max: 34 })
})

test('realistic profile is less extreme than fun profile', () =>
{
    const realistic = getSuspensionProfile(SUSPENSION_MODES.REALISTIC)
    const fun = getSuspensionProfile(SUSPENSION_MODES.FUN)

    assert.ok(realistic.heights.high < fun.heights.high)
    assert.ok(realistic.maxSuspensionTravel < fun.maxSuspensionTravel)
    assert.equal(realistic.allWheelsActiveState, 'mid')
    assert.equal(fun.allWheelsActiveState, 'high')
})

test('unknown mode falls back to realistic', () =>
{
    assert.equal(
        getSuspensionProfile('invalid'),
        getSuspensionProfile(SUSPENSION_MODES.REALISTIC),
    )
})
```

- [ ] **Step 3: Run the failing test**

Run: `npm run test:vehicle`

Expected: FAIL with `Cannot find module .../VehicleProfiles.js`。

- [ ] **Step 4: Implement `VehicleProfiles.js`**

```js
export const SUSPENSION_MODES = Object.freeze({
    REALISTIC: 'realistic',
    FUN: 'fun',
})

const profiles = Object.freeze({
    realistic: Object.freeze({
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
    fun: Object.freeze({
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

export const VEHICLE_PROFILE = Object.freeze({
    colliders: Object.freeze([
        Object.freeze({
            shape: 'cuboid',
            mass: 2.8,
            parameters: Object.freeze([ 2.18, 0.34, 0.88 ]),
            position: Object.freeze({ x: 0, y: -0.12, z: 0 }),
            centerOfMass: Object.freeze({ x: -0.08, y: -0.58, z: 0 }),
        }),
        Object.freeze({
            shape: 'cuboid',
            mass: 0,
            parameters: Object.freeze([ 0.98, 0.23, 0.70 ]),
            position: Object.freeze({ x: -0.28, y: 0.39, z: 0 }),
        }),
        Object.freeze({
            shape: 'cuboid',
            mass: 0,
            parameters: Object.freeze([ 2.30, 0.46, 0.93 ]),
            position: Object.freeze({ x: 0, y: -0.18, z: 0 }),
            category: 'bumper',
        }),
    ]),
    wheels: Object.freeze({
        offset: Object.freeze({ x: 1.35, y: 0, z: 0.76 }),
        radius: 0.43,
    }),
    camera: Object.freeze({
        radiusEdges: Object.freeze({ min: 17, max: 34 }),
        nonIdealRatioOffset: 10,
        focusHeight: 0.35,
    }),
    effects: Object.freeze({
        boostLeft: Object.freeze({ x: -2.12, y: 0.02, z: -0.56 }),
        boostRight: Object.freeze({ x: -2.12, y: 0.02, z: 0.56 }),
    }),
})

export function getSuspensionProfile(mode)
{
    return profiles[mode] ?? profiles.realistic
}
```

- [ ] **Step 5: Verify and commit**

```bash
npm run test:vehicle
git add package.json sources/Game/Vehicle/VehicleProfiles.js tests/vehicle/VehicleProfiles.test.js
git commit -m "test: define SU7 vehicle profiles"
```

Expected: 3 PASS，0 FAIL。

---

### Task 2: Suspension Mode State and J Shortcut

**Files:**
- Create: `sources/Game/Vehicle/SuspensionMode.js`
- Create: `tests/vehicle/SuspensionMode.test.js`
- Modify: `sources/Game/Game.js`

**Interfaces:**
- Produces: `SuspensionMode.current`、`.set(mode)`、`.toggle()`、`.events`。
- Consumes: `inputs.addActions()`、`inputs.events`、`notifications.show()`。

- [ ] **Step 1: Write failing state tests**

```js
// tests/vehicle/SuspensionMode.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { SuspensionMode } from '../../sources/Game/Vehicle/SuspensionMode.js'

function storage(initial = {})
{
    const values = new Map(Object.entries(initial))
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
    }
}

function inputs()
{
    const listeners = new Map()
    return {
        actions: [],
        addActions(items) { this.actions.push(...items) },
        events: { on(name, callback) { listeners.set(name, callback) } },
        fire(name, action) { listeners.get(name)?.(action) },
    }
}

test('defaults to realistic and persists fun', () =>
{
    const store = storage()
    const value = new SuspensionMode({ storage: store })
    assert.equal(value.current, 'realistic')
    value.set('fun')
    assert.equal(store.getItem('vehicleSuspensionMode'), 'fun')
})

test('invalid stored value falls back to realistic', () =>
{
    const value = new SuspensionMode({
        storage: storage({ vehicleSuspensionMode: 'broken' }),
    })
    assert.equal(value.current, 'realistic')
})

test('J toggles and H is not claimed', () =>
{
    const input = inputs()
    const value = new SuspensionMode({ storage: storage(), inputs: input })

    assert.deepEqual(input.actions, [{
        name: 'suspensionModeToggle',
        categories: [ 'wandering', 'racing' ],
        keys: [ 'Keyboard.KeyJ' ],
    }])

    input.fire('suspensionModeToggle', { active: true })
    assert.equal(value.current, 'fun')
    assert.equal(input.actions.some(item => item.keys.includes('Keyboard.KeyH')), false)
})
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npm run test:vehicle`

Expected: FAIL because `SuspensionMode.js` does not exist。

- [ ] **Step 3: Implement `SuspensionMode.js`**

```js
import { Events } from '../Events.js'
import { SUSPENSION_MODES } from './VehicleProfiles.js'

const STORAGE_KEY = 'vehicleSuspensionMode'
const validModes = new Set(Object.values(SUSPENSION_MODES))

export class SuspensionMode
{
    constructor({ storage = globalThis.localStorage, inputs = null, notifications = null } = {})
    {
        this.storage = storage
        this.inputs = inputs
        this.notifications = notifications
        this.events = new Events()
        this.current = this.read()

        if(this.inputs)
            this.bindInput()
    }

    read()
    {
        try
        {
            const value = this.storage?.getItem(STORAGE_KEY)
            return validModes.has(value) ? value : SUSPENSION_MODES.REALISTIC
        }
        catch
        {
            return SUSPENSION_MODES.REALISTIC
        }
    }

    bindInput()
    {
        this.inputs.addActions([{
            name: 'suspensionModeToggle',
            categories: [ 'wandering', 'racing' ],
            keys: [ 'Keyboard.KeyJ' ],
        }])

        this.inputs.events.on('suspensionModeToggle', action =>
        {
            if(action.active)
                this.toggle()
        })
    }

    set(mode)
    {
        const next = validModes.has(mode) ? mode : SUSPENSION_MODES.REALISTIC
        if(next === this.current)
            return false

        this.current = next
        try { this.storage?.setItem(STORAGE_KEY, next) } catch {}

        this.events.trigger('change', [ next ])
        this.notify(next)
        return true
    }

    toggle()
    {
        return this.set(this.current === 'realistic' ? 'fun' : 'realistic')
    }

    notify(mode)
    {
        if(!this.notifications)
            return

        const label = mode === 'realistic' ? '写实' : '娱乐'
        this.notifications.show(
            `<div class="top"><div class="title">悬架模式：${label}</div></div>`,
            'info',
            2,
            null,
            'suspension-mode',
        )
    }
}
```

- [ ] **Step 4: Initialize it in `Game.js`**

Add import:

```js
import { SuspensionMode } from './Vehicle/SuspensionMode.js'
```

Immediately after `this.notifications = new Notifications()` add:

```js
this.suspensionMode = new SuspensionMode({
    storage: globalThis.localStorage,
    inputs: this.inputs,
    notifications: this.notifications,
})
```

- [ ] **Step 5: Verify and commit**

```bash
npm run test:vehicle
node --check sources/Game/Vehicle/SuspensionMode.js
node --check sources/Game/Game.js
git add sources/Game/Vehicle/SuspensionMode.js tests/vehicle/SuspensionMode.test.js sources/Game/Game.js
git commit -m "feat: add persistent suspension modes"
```

---

### Task 3: Settings Menu Synchronization

**Files:**
- Modify: `sources/index.html`
- Modify: `sources/Game/Options.js`
- Modify: `sources/i18n-zh.js`

**Interfaces:**
- Consumes: `game.suspensionMode.current`、`.toggle()`、`.events.on('change')`。
- Produces: `.js-suspension-mode` button。

- [ ] **Step 1: Add a row before Renderer in `sources/index.html`**

```html
<tr>
    <td>Suspension mode</td>
    <td>
        <button class="js-suspension-mode button is-small has-tooltip">
            <div class="tooltip">Press J to toggle</div>
            <span>Realistic</span>
        </button>
    </td>
</tr>
```

- [ ] **Step 2: Add translation entries**

```js
"Suspension mode": "悬架模式",
"Press J to toggle": "按 J 键切换",
"Realistic": "写实",
"Fun": "娱乐",
```

- [ ] **Step 3: Add `setSuspensionMode()` to `Options`**

Call it after `setQuality()`：

```js
this.setQuality()
this.setSuspensionMode()
this.setRespawn()
```

Method：

```js
setSuspensionMode()
{
    const element = this.element.querySelector('.js-suspension-mode')
    const text = element.querySelector('span')

    const update = mode =>
    {
        text.textContent = mode === 'realistic' ? 'Realistic' : 'Fun'
    }

    update(this.game.suspensionMode.current)
    element.addEventListener('click', () => this.game.suspensionMode.toggle())
    this.game.suspensionMode.events.on('change', update)
}
```

- [ ] **Step 4: Verify and commit**

```bash
node --check sources/Game/Options.js
node --check sources/i18n-zh.js
npm run build
git add sources/index.html sources/Game/Options.js sources/i18n-zh.js
git commit -m "feat: add suspension mode controls"
```

Expected: button and `J` always show the same mode。

---

### Task 4: Optional SU7 Loading and Model Contract

**Files:**
- Create: `sources/Game/Vehicle/VehicleModelContract.js`
- Create: `tests/vehicle/VehicleModelContract.test.js`
- Modify: `sources/Game/ResourcesLoader.js`
- Modify: `sources/Game/Game.js`
- Modify: `sources/Game/World/World.js`

**Interfaces:**
- Produces: `inspectVehicleModel(root)`、`selectVehicleModel(primary, fallback, logger)`。
- Extends resource tuple with fifth value `{ optional: true }`。

- [ ] **Step 1: Write failing contract tests**

```js
// tests/vehicle/VehicleModelContract.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
    inspectVehicleModel,
    selectVehicleModel,
} from '../../sources/Game/Vehicle/VehicleModelContract.js'

function tree(names)
{
    return {
        traverse(callback)
        {
            callback({ name: 'root' })
            for(const name of names)
                callback({ name })
        },
    }
}

const complete = [
    'chassis.001',
    'bodyPaintedMain',
    'wheelContainer',
    'wheelSuspensionFront',
    'wheelCylinder',
    'wheelPainted',
]

test('required nodes match by prefix', () =>
{
    assert.equal(inspectVehicleModel(tree(complete)).valid, true)
})

test('invalid SU7 falls back to valid original model', () =>
{
    const primary = tree([ 'chassis' ])
    const fallback = tree(complete)
    assert.equal(selectVehicleModel(primary, fallback, { warn() {} }).model, fallback)
})
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npm run test:vehicle`

Expected: FAIL because `VehicleModelContract.js` does not exist。

- [ ] **Step 3: Implement prefix-based validation**

```js
const REQUIRED = Object.freeze([
    'chassis',
    'bodyPainted',
    'wheelContainer',
    'wheelSuspension',
    'wheelCylinder',
    'wheelPainted',
])

const OPTIONAL = Object.freeze([
    'blinkerLeft',
    'blinkerRight',
    'stopLights',
    'backLights',
    'antenna',
    'cell1',
    'cell2',
    'cell3',
    'energy',
])

function hasPrefix(names, prefix)
{
    return names.some(name => name.toLowerCase().startsWith(prefix.toLowerCase()))
}

export function inspectVehicleModel(root)
{
    const names = []
    root?.traverse?.(child => names.push(child.name ?? ''))

    const missingRequired = REQUIRED.filter(prefix => !hasPrefix(names, prefix))
    const missingOptional = OPTIONAL.filter(prefix => !hasPrefix(names, prefix))

    return {
        valid: missingRequired.length === 0,
        missingRequired,
        missingOptional,
    }
}

export function selectVehicleModel(primary, fallback, logger = console)
{
    const primaryResult = inspectVehicleModel(primary)
    if(primary && primaryResult.valid)
        return { model: primary, source: 'su7', inspection: primaryResult }

    logger.warn?.(`SU7 vehicle fallback: ${primaryResult.missingRequired.join(', ') || 'resource unavailable'}`)

    const fallbackResult = inspectVehicleModel(fallback)
    if(!fallback || !fallbackResult.valid)
        throw new Error(`Fallback vehicle is invalid: ${fallbackResult.missingRequired.join(', ')}`)

    return { model: fallback, source: 'default', inspection: fallbackResult }
}
```

- [ ] **Step 4: Correctly wrap loader errors with the current file tuple**

Replace the current error function with：

```js
const error = (_file, loadError) =>
{
    const options = _file[4] ?? {}
    console.log(`Resources > Couldn't load file ${_file[1]}`, loadError)

    if(options.optional)
    {
        loadedResources[_file[0]] = null
        progress()
        return
    }

    reject(_file[1])
}
```

Replace the `loader.load()` error callback argument with：

```js
(loadError) => error(_file, loadError)
```

Do not pass `error` directly, because the loader only supplies the error event and not `_file`。

- [ ] **Step 5: Load both vehicle resources in `Game.js`**

Replace the original vehicle tuple with：

```js
[ 'vehicleSu7', `vehicle/su7${compressedModelSuffix}.glb${cb}`, 'gltf', undefined, { optional: true } ],
[ 'vehicleFallback', `vehicle/default${compressedModelSuffix}.glb${cb}`, 'gltf' ],
```

- [ ] **Step 6: Select the model in `World.js`**

Add：

```js
import { selectVehicleModel } from '../Vehicle/VehicleModelContract.js'
```

Replace `new VisualVehicle(this.game.resources.vehicle.scene)` with：

```js
const selection = selectVehicleModel(
    this.game.resources.vehicleSu7?.scene ?? null,
    this.game.resources.vehicleFallback.scene,
)

this.vehicleSource = selection.source
this.visualVehicle = new VisualVehicle(selection.model)
```

- [ ] **Step 7: Verify and commit**

```bash
npm run test:vehicle
npm run build
git add sources/Game/Vehicle/VehicleModelContract.js tests/vehicle/VehicleModelContract.test.js sources/Game/ResourcesLoader.js sources/Game/Game.js sources/Game/World/World.js
git commit -m "feat: add validated vehicle fallback"
```

Expected: tests PASS；SU7 404 时原车仍加载。

---

### Task 5: Generate the Low-Poly SU7 GLB

**Files:**
- Create: `scripts/vehicle/generate-su7.py`
- Create: `static/vehicle/su7.glb`
- Create: `static/vehicle/su7-compressed.glb`
- Modify: `package.json`

**Interfaces:**
- Produces: GLB with the exact required node prefixes。
- Consumed by: `Game.js` and `VisualVehicle`。

- [ ] **Step 1: Add repeatable model commands**

Merge these entries into `package.json` scripts：

```json
{
  "vehicle:generate": "blender --background --python scripts/vehicle/generate-su7.py",
  "vehicle:compress": "gltf-transform optimize static/vehicle/su7.glb static/vehicle/su7-compressed.glb --compress draco",
  "vehicle:inspect": "gltf-transform inspect static/vehicle/su7-compressed.glb"
}
```

- [ ] **Step 2: Create the complete Blender generator**

```python
# scripts/vehicle/generate-su7.py
import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'static' / 'vehicle' / 'su7.glb'


def reset_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def make_material(name, color, metallic=0.0, roughness=0.65, emission=None):
    value = bpy.data.materials.new(name)
    value.use_nodes = True
    value.diffuse_color = color
    bsdf = value.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Alpha'].default_value = color[3]
    if emission is not None:
        bsdf.inputs['Emission Color'].default_value = emission
        bsdf.inputs['Emission Strength'].default_value = 3.0
    return value


def add_cube(name, location, dimensions, material, bevel=0.08):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new('lowPolyBevel', 'BEVEL')
    modifier.width = bevel
    modifier.segments = 1
    obj.data.materials.append(material)
    return obj


def add_cylinder(name, radius, depth, material, vertices):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        rotation=(math.pi / 2, 0, 0),
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def join(name, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    objects[0].name = name
    return objects[0]


def attach(child, parent):
    child.parent = parent


def empty(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    if parent is not None:
        attach(obj, parent)
    return obj


def build_vehicle():
    grey = make_material('雅灰', (0.32, 0.34, 0.35, 1), 0.38, 0.52)
    dark = make_material('Dark', (0.025, 0.03, 0.035, 1), 0.05, 0.82)
    glass_material = make_material('Glass', (0.04, 0.08, 0.10, 0.72), 0.05, 0.18)
    white = make_material('WhiteLight', (1, 1, 1, 1), 0, 0.25, (1, 1, 1, 1))
    red = make_material('RedLight', (1, 0.015, 0.01, 1), 0, 0.28, (1, 0.015, 0.01, 1))
    amber = make_material('AmberLight', (1, 0.30, 0.01, 1), 0, 0.28, (1, 0.30, 0.01, 1))

    root = empty('vehicleRoot')
    chassis = empty('chassis', root)

    body = join('bodyPainted', [
        add_cube('bodyLower', (0.00, 0.00, 0.63), (4.58, 1.82, 0.54), grey, 0.16),
        add_cube('bodyShoulder', (-0.08, 0.00, 0.94), (3.82, 1.70, 0.34), grey, 0.18),
        add_cube('hood', (1.43, 0.00, 1.08), (1.55, 1.66, 0.20), grey, 0.12),
        add_cube('duckTail', (-2.05, 0.00, 1.10), (0.34, 1.55, 0.13), grey, 0.06),
    ])
    attach(body, chassis)

    glass = add_cube('glass', (-0.38, 0.00, 1.35), (2.20, 1.42, 0.56), glass_material, 0.24)
    attach(glass, chassis)

    headlights = join('headlights', [
        add_cube('headlightLeft', (2.18, -0.60, 0.96), (0.10, 0.38, 0.13), white, 0.04),
        add_cube('headlightRight', (2.18, 0.60, 0.96), (0.10, 0.38, 0.13), white, 0.04),
    ])
    attach(headlights, chassis)

    back_lights = add_cube('backLights', (-2.27, 0.00, 1.03), (0.08, 1.48, 0.10), red, 0.03)
    stop_lights = add_cube('stopLights', (-2.28, 0.00, 1.03), (0.06, 1.48, 0.10), red, 0.03)
    blinker_left = add_cube('blinkerLeft', (-2.29, -0.78, 1.01), (0.06, 0.10, 0.10), amber, 0.02)
    blinker_right = add_cube('blinkerRight', (-2.29, 0.78, 1.01), (0.06, 0.10, 0.10), amber, 0.02)
    for light in [ back_lights, stop_lights, blinker_left, blinker_right ]:
        attach(light, chassis)

    wheel_container = empty('wheelContainer', chassis)
    wheel_suspension = empty('wheelSuspension', wheel_container)
    wheel_cylinder = add_cylinder('wheelCylinder', 0.43, 0.24, dark, 16)
    wheel_painted = add_cylinder('wheelPainted', 0.30, 0.255, grey, 12)
    attach(wheel_cylinder, wheel_suspension)
    attach(wheel_painted, wheel_suspension)

    return root


reset_scene()
build_vehicle()
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT),
    export_format='GLB',
    use_selection=False,
    export_yup=True,
    export_apply=True,
    export_materials='EXPORT',
    export_cameras=False,
    export_lights=False,
)
print(f'Generated {OUTPUT}')
```

- [ ] **Step 3: Generate, compress and inspect**

```bash
npm run vehicle:generate
npm run vehicle:compress
npm run vehicle:inspect
```

Expected:

- Both GLB files exist。
- Required node prefixes are present。
- Compressed GLB is below 5 MiB。
- Triangle count is no more than 30,000。
- Material count is no more than 8。

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/vehicle/generate-su7.py static/vehicle/su7.glb static/vehicle/su7-compressed.glb
git commit -m "feat: add low-poly Xiaomi SU7 model"
```

---

### Task 6: Visual Vehicle Adaptation

**Files:**
- Modify: `sources/Game/World/VisualVehicle.js`

**Interfaces:**
- Consumes: `VEHICLE_PROFILE.effects` and validated model nodes。

- [ ] **Step 1: Import profile**

```js
import { VEHICLE_PROFILE } from '../Vehicle/VehicleProfiles.js'
```

- [ ] **Step 2: Assert required visual roots after traversal**

```js
for(const name of [ 'chassis', 'bodyPainted', 'wheelContainer' ])
{
    if(!this.parts[name])
        throw new Error(`Vehicle model missing required visual node: ${name}`)
}
```

- [ ] **Step 3: Assert wheel template children**

After traversing each cloned wheel：

```js
if(!wheel.suspension || !wheel.cylinder)
    throw new Error('wheelContainer must contain wheelSuspension and wheelCylinder')
```

Continue treating blinkers, stop lights, back lights and painted wheel parts as optional with existing `if(...)` checks。

- [ ] **Step 4: Add 雅灰 default material without removing rewards**

```js
this.paints.choices.su7Grey = this.game.materials.createGradient(
    'su7GreyGradient',
    '#737779',
    '#313538',
    this.game.materials.debugPanel?.addFolder({ title: 'su7GreyGradient' }),
)

const rewardPaint = this.game.achievements.rewards.current.name
this.paints.changeTo(rewardPaint === 'red' ? 'su7Grey' : rewardPaint)
```

Keep the existing reward-change event unchanged。

- [ ] **Step 5: Move boost trails to SU7 rear positions**

```js
const { boostLeft, boostRight } = VEHICLE_PROFILE.effects
this.boostTrails.leftReference.position.set(boostLeft.x, boostLeft.y, boostLeft.z)
this.boostTrails.rightReference.position.set(boostRight.x, boostRight.y, boostRight.z)
```

- [ ] **Step 6: Verify and commit**

```bash
node --check sources/Game/World/VisualVehicle.js
npm run build
git add sources/Game/World/VisualVehicle.js
git commit -m "feat: adapt visual vehicle to SU7"
```

---

### Task 7: SU7 Physics, Suspension Behaviour and Camera

**Files:**
- Modify: `sources/Game/Physics/PhysicsVehicle.js`
- Modify: `sources/Game/Player.js`
- Modify: `sources/Game/View.js`

**Interfaces:**
- Consumes: `VEHICLE_PROFILE` and `getSuspensionProfile(mode)`。
- Produces: `PhysicsVehicle.applySuspensionMode(mode)`。

- [ ] **Step 1: Import profiles in `PhysicsVehicle.js`**

```js
import {
    VEHICLE_PROFILE,
    getSuspensionProfile,
} from '../Vehicle/VehicleProfiles.js'
```

Initialize：

```js
const initialProfile = getSuspensionProfile(this.game.suspensionMode.current)
this.suspensionsHeights = { ...initialProfile.heights }
this.suspensionsStiffness = { ...initialProfile.stiffness }
```

- [ ] **Step 2: Replace inline colliders**

```js
colliders: VEHICLE_PROFILE.colliders.map(collider => ({
    ...collider,
    parameters: [ ...collider.parameters ],
    position: { ...collider.position },
    centerOfMass: collider.centerOfMass ? { ...collider.centerOfMass } : undefined,
})),
```

- [ ] **Step 3: Replace wheel offset, radius and active suspension values**

```js
this.wheels.settings = {
    offset: { ...VEHICLE_PROFILE.wheels.offset },
    radius: VEHICLE_PROFILE.wheels.radius,
    directionCs: { x: 0, y: -1, z: 0 },
    axleCs: { x: 0, y: 0, z: 1 },
    frictionSlip: 0.9,
    maxSuspensionForce: initialProfile.maxSuspensionForce,
    maxSuspensionTravel: initialProfile.maxSuspensionTravel,
    sideFrictionStiffness: initialProfile.sideFrictionStiffness,
    suspensionCompression: initialProfile.suspensionCompression,
    suspensionRelaxation: initialProfile.suspensionRelaxation,
    suspensionStiffness: initialProfile.stiffness.mid,
}
```

- [ ] **Step 4: Implement and subscribe `applySuspensionMode()`**

```js
applySuspensionMode(mode)
{
    const profile = getSuspensionProfile(mode)
    Object.assign(this.suspensionsHeights, profile.heights)
    Object.assign(this.suspensionsStiffness, profile.stiffness)
    this.wheels.settings.maxSuspensionForce = profile.maxSuspensionForce
    this.wheels.settings.maxSuspensionTravel = profile.maxSuspensionTravel
    this.wheels.settings.sideFrictionStiffness = profile.sideFrictionStiffness
    this.wheels.settings.suspensionCompression = profile.suspensionCompression
    this.wheels.settings.suspensionRelaxation = profile.suspensionRelaxation
    this.wheels.updateSettings()
}
```

After `setWheels()`：

```js
this.game.suspensionMode.events.on('change', mode => this.applySuspensionMode(mode))
```

Ensure `wheels.updateSettings()` calls all corresponding Rapier controller setters already used in `setWheels()`。

- [ ] **Step 5: Make Player mode-aware**

Import：

```js
import { getSuspensionProfile } from './Vehicle/VehicleProfiles.js'
```

Replace `activeState`：

```js
const profile = getSuspensionProfile(this.game.suspensionMode.current)
const allWheels = this.game.inputs.actions.get('suspensions').active
const activeState = allWheels
    ? profile.allWheelsActiveState
    : profile.partialActiveState
```

For touch tap：

```js
const tapState = getSuspensionProfile(this.game.suspensionMode.current).allWheelsActiveState
for(let i = 0; i < 4; i++)
    this.suspensions[i] = tapState
```

Do not modify the existing `Keyboard.KeyH` honk mapping。

- [ ] **Step 6: Apply camera profile in `View.js`**

```js
import { VEHICLE_PROFILE } from './Vehicle/VehicleProfiles.js'
```

Use：

```js
this.focusPoint.trackedPosition = new THREE.Vector3(
    defaultRespawn.position.x,
    VEHICLE_PROFILE.camera.focusHeight,
    defaultRespawn.position.z,
)

this.spherical.radius.edges = { ...VEHICLE_PROFILE.camera.radiusEdges }
this.spherical.radius.nonIdealRatioOffset = VEHICLE_PROFILE.camera.nonIdealRatioOffset
```

- [ ] **Step 7: Verify and commit**

```bash
npm run test:vehicle
node --check sources/Game/Physics/PhysicsVehicle.js
node --check sources/Game/Player.js
node --check sources/Game/View.js
npm run build
git add sources/Game/Physics/PhysicsVehicle.js sources/Game/Player.js sources/Game/View.js
git commit -m "feat: tune SU7 physics and suspension"
```

---

### Task 8: Browser, Fallback and Cloudflare Acceptance

**Files:**
- Test only; no planned source edits.
- A failed check returns to the owning task before this task continues。
- Modify after user acceptance only: `docs/superpowers/specs/2026-07-23-xiaomi-su7-vehicle-design.md` line 6 status。

**Interfaces:**
- Produces: reviewed PR and Cloudflare preview deployment。

- [ ] **Step 1: Run complete local verification**

```bash
npm clean-install
npm run test
npm run build
```

Expected: all commands exit 0。

- [ ] **Step 2: Start the app and confirm SU7 selection**

```bash
npm run dev
```

Browser console：

```js
game.world.vehicleSource
```

Expected: `"su7"`。

Visually verify：

- Four wheels touch the ground and stay aligned while steering。
- Camera does not enter the longer body。
- Headlights, halo-style rear light, blinkers, brake lights and trails are aligned。
- Collision shape is close to the visible body。

- [ ] **Step 3: Verify controls**

```text
Refresh → realistic
Space → small lift, no high jump
J → notification says 娱乐
Space → original high jump
Numpad 1–9 → independent suspension works
H → honk only
Refresh → fun remains selected
J → back to realistic
```

Expected: every line behaves exactly as written。

- [ ] **Step 4: Verify runtime fallback**

Temporarily change the SU7 path to `vehicle/su7-missing...glb` and run `npm run dev`。

Expected:

```js
game.world.vehicleSource === 'default'
```

The original vehicle loads and one clear warning is logged。Restore the correct path before any commit。

- [ ] **Step 5: Verify asset budgets**

Linux/macOS：

```bash
npm run vehicle:inspect
find static -type f -size +25M -print
find dist -type f -size +25M -print
```

PowerShell：

```powershell
Get-ChildItem static -Recurse -File | Where-Object Length -GT 25MB
Get-ChildItem dist -Recurse -File | Where-Object Length -GT 25MB
```

Expected: no over-limit files；`su7-compressed.glb` < 5 MiB。

- [ ] **Step 6: Push preview branch**

```bash
git push -u origin feat/xiaomi-su7-vehicle
```

Wait for Cloudflare preview and verify HTTP 200 for：

```text
/vehicle/su7-compressed.glb
/vehicle/default-compressed.glb
```

Expected: Wrangler deploy succeeds with no `Asset too large`。

- [ ] **Step 7: Open PR**

```bash
gh pr create \
  --base main \
  --head feat/xiaomi-su7-vehicle \
  --title "feat: replace vehicle with low-poly Xiaomi SU7" \
  --body "Adds an 雅灰 low-poly Xiaomi SU7 Pro, validated fallback, SU7 physics tuning, and persistent realistic/fun suspension modes with J-key and settings controls."
```

PR must include：

- Desktop front, rear and side screenshots。
- One mobile screenshot。
- Realistic and fun mode clips。
- `npm run test` and `npm run build` results。
- Cloudflare preview URL。

- [ ] **Step 8: Mark the design implemented only after user acceptance**

Change：

```text
状态：待用户最终审阅
```

to：

```text
状态：已实现并验收
```

Commit：

```bash
git add docs/superpowers/specs/2026-07-23-xiaomi-su7-vehicle-design.md
git commit -m "docs: mark SU7 design implemented"
```
