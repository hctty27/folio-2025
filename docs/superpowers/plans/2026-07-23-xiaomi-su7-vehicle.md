# 小米 SU7 Pro 低多边形车辆 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将默认可驾驶车辆替换为雅灰低多边形 2024 小米 SU7 Pro，并新增可持久化的写实／娱乐双悬架模式，支持设置菜单与 `J` 键切换，同时保持 `H` 鸣笛和原有玩法。

**Architecture:** 保留原项目 `VisualVehicle`、`PhysicsVehicle` 与 `Player` 的职责边界，新增纯状态组件 `SuspensionMode`、纯配置模块 `VehicleProfiles` 和模型契约验证器 `VehicleModelContract`。SU7 与原车模型同时加载：SU7 是首选资源，加载或节点校验失败时回退原车；物理参数、输入行为和相机参数均由集中配置驱动。

**Tech Stack:** JavaScript ES modules、Three.js 0.183、Rapier3D 0.17、Node.js 22、Node Test Runner、Vite 7、Blender glTF 2.0 导出、gltf-transform CLI、Cloudflare Workers Static Assets。

## Global Constraints

- 基线分支：`main`，设计文档：`docs/superpowers/specs/2026-07-23-xiaomi-su7-vehicle-design.md`。
- 不新增运行时 npm 依赖；仅使用仓库已有的 `three`、`@gltf-transform/*`、Rapier 和 Node 内置模块。
- 默认车型：2024 小米 SU7 Pro，低多边形卡通风格，雅灰，19 英寸低风阻轮毂。
- 默认悬架模式：`realistic`；另一模式：`fun`。
- `J` 只切换悬架模式；`H` 继续只负责鸣笛。
- 状态键固定为 `localStorage.vehicleSuspensionMode`。
- SU7 模型必需节点：`chassis`、`bodyPainted`、`wheelContainer`、`wheelSuspension`、`wheelCylinder`、`wheelPainted`。
- SU7 模型可选节点：`blinkerLeft`、`blinkerRight`、`stopLights`、`backLights`、`antenna`、`cell1`、`cell2`、`cell3`、`energy`。
- 整车三角面目标 8,000–20,000，硬上限 30,000；材质不超过 8；压缩后 GLB 目标小于 2 MiB、硬上限 5 MiB。
- 所有 Cloudflare 静态文件必须小于 25 MiB。
- 原始车辆 `static/vehicle/default.glb` 与 `default-compressed.glb` 保留作为回退，不覆盖、不删除。
- 每个任务独立测试、独立提交；禁止在同一提交夹带中文化、地图或其他无关改动。

---

## 文件结构

### 新建

- `sources/Game/Vehicle/SuspensionMode.js`：管理模式、持久化、快捷键和变更事件。
- `sources/Game/Vehicle/VehicleProfiles.js`：集中定义 SU7 尺寸、碰撞体、轮位、相机与两套悬架参数。
- `sources/Game/Vehicle/VehicleModelContract.js`：验证 GLB 节点并选择 SU7 或回退模型。
- `tests/vehicle/SuspensionMode.test.js`：模式状态与持久化单元测试。
- `tests/vehicle/VehicleProfiles.test.js`：参数完整性和模式差异单元测试。
- `tests/vehicle/VehicleModelContract.test.js`：必需／可选节点和回退选择测试。
- `scripts/vehicle/generate-su7.py`：可重复生成雅灰低多边形 SU7 原始 GLB 的 Blender Python 脚本。
- `static/vehicle/su7.glb`：未压缩 SU7 模型。
- `static/vehicle/su7-compressed.glb`：生产使用的压缩 SU7 模型。

### 修改

- `package.json`：增加测试、模型生成与车辆资源校验脚本。
- `sources/Game/Game.js`：加载 SU7 与原车回退资源，初始化 `SuspensionMode`。
- `sources/Game/ResourcesLoader.js`：支持可选资源加载失败后继续构建资源集合。
- `sources/Game/World/World.js`：验证并选择车辆模型。
- `sources/Game/World/VisualVehicle.js`：安全处理可选节点、SU7 灯光和挂点。
- `sources/Game/Physics/PhysicsVehicle.js`：应用 SU7 碰撞体、轮位和悬架 profile。
- `sources/Game/Player.js`：根据模式决定悬架动作状态，并绑定 `J` 以外的原有输入。
- `sources/Game/View.js`：读取 SU7 相机 profile。
- `sources/Game/Options.js`：同步设置菜单按钮。
- `sources/index.html`：增加悬架模式设置行。
- `sources/i18n-zh.js`：增加悬架相关中文词条。

---

### Task 1: 建立测试入口与集中车辆配置

**Files:**
- Create: `sources/Game/Vehicle/VehicleProfiles.js`
- Create: `tests/vehicle/VehicleProfiles.test.js`
- Modify: `package.json:8-13`

**Interfaces:**
- Produces: `VEHICLE_PROFILE`, `SUSPENSION_MODES`, `getSuspensionProfile(mode)`。
- Consumers: `PhysicsVehicle`、`Player`、`View`、后续测试。

- [ ] **Step 1: 在 `package.json` 增加测试命令**

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

- [ ] **Step 2: 写失败测试 `tests/vehicle/VehicleProfiles.test.js`**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
    SUSPENSION_MODES,
    VEHICLE_PROFILE,
    getSuspensionProfile,
} from '../../sources/Game/Vehicle/VehicleProfiles.js'

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
        assert.ok(profile.suspensionCompression > 0)
        assert.ok(profile.suspensionRelaxation > 0)
    }

    assert.ok(realistic.heights.high < fun.heights.high)
    assert.ok(realistic.maxSuspensionTravel < fun.maxSuspensionTravel)
})

test('unknown suspension mode falls back to realistic', () =>
{
    assert.equal(
        getSuspensionProfile('unknown'),
        getSuspensionProfile(SUSPENSION_MODES.REALISTIC),
    )
})
```

- [ ] **Step 3: 运行测试并确认失败**

Run:

```bash
npm run test:vehicle
```

Expected: FAIL，错误包含 `Cannot find module .../VehicleProfiles.js`。

- [ ] **Step 4: 创建 `sources/Game/Vehicle/VehicleProfiles.js`**

```js
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

export const VEHICLE_PROFILE = Object.freeze({
    name: 'xiaomi-su7-pro-2024',
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
    return suspensionProfiles[mode] ?? suspensionProfiles[SUSPENSION_MODES.REALISTIC]
}
```

- [ ] **Step 5: 运行测试并确认通过**

Run:

```bash
npm run test:vehicle
```

Expected: 3 tests PASS，0 FAIL。

- [ ] **Step 6: 提交**

```bash
git add package.json sources/Game/Vehicle/VehicleProfiles.js tests/vehicle/VehicleProfiles.test.js
git commit -m "test: define SU7 vehicle profiles"
```

---

### Task 2: 实现悬架模式状态、持久化与 `J` 键切换

**Files:**
- Create: `sources/Game/Vehicle/SuspensionMode.js`
- Create: `tests/vehicle/SuspensionMode.test.js`
- Modify: `sources/Game/Game.js:3-112`

**Interfaces:**
- Consumes: `SUSPENSION_MODES` from `VehicleProfiles.js`。
- Produces: `new SuspensionMode({ storage, inputs, notifications })`、`.current`、`.set(mode)`、`.toggle()`、`.events`。
- Consumers: `Options`、`PhysicsVehicle`、`Player`。

- [ ] **Step 1: 写失败测试 `tests/vehicle/SuspensionMode.test.js`**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { SuspensionMode } from '../../sources/Game/Vehicle/SuspensionMode.js'
import { SUSPENSION_MODES } from '../../sources/Game/Vehicle/VehicleProfiles.js'

function createStorage(initial = {})
{
    const values = new Map(Object.entries(initial))
    return {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, value),
    }
}

function createInputs()
{
    const listeners = new Map()
    return {
        actions: [],
        addActions(actions) { this.actions.push(...actions) },
        events: {
            on(name, callback) { listeners.set(name, callback) },
        },
        fire(name, action) { listeners.get(name)?.(action) },
    }
}

test('defaults to realistic and persists explicit changes', () =>
{
    const storage = createStorage()
    const mode = new SuspensionMode({ storage })

    assert.equal(mode.current, SUSPENSION_MODES.REALISTIC)
    mode.set(SUSPENSION_MODES.FUN)
    assert.equal(storage.getItem('vehicleSuspensionMode'), SUSPENSION_MODES.FUN)
})

test('restores fun and rejects unknown persisted values', () =>
{
    assert.equal(
        new SuspensionMode({ storage: createStorage({ vehicleSuspensionMode: 'fun' }) }).current,
        SUSPENSION_MODES.FUN,
    )
    assert.equal(
        new SuspensionMode({ storage: createStorage({ vehicleSuspensionMode: 'broken' }) }).current,
        SUSPENSION_MODES.REALISTIC,
    )
})

test('J action toggles once on active event and does not claim H', () =>
{
    const inputs = createInputs()
    const mode = new SuspensionMode({ storage: createStorage(), inputs })

    assert.deepEqual(inputs.actions, [{
        name: 'suspensionModeToggle',
        categories: [ 'wandering', 'racing' ],
        keys: [ 'Keyboard.KeyJ' ],
    }])

    inputs.fire('suspensionModeToggle', { active: false })
    assert.equal(mode.current, SUSPENSION_MODES.REALISTIC)

    inputs.fire('suspensionModeToggle', { active: true })
    assert.equal(mode.current, SUSPENSION_MODES.FUN)
    assert.equal(inputs.actions.some(action => action.keys.includes('Keyboard.KeyH')), false)
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test:vehicle`

Expected: FAIL，错误包含 `Cannot find module .../SuspensionMode.js`。

- [ ] **Step 3: 创建 `sources/Game/Vehicle/SuspensionMode.js`**

```js
import { Events } from '../Events.js'
import { SUSPENSION_MODES } from './VehicleProfiles.js'

const STORAGE_KEY = 'vehicleSuspensionMode'
const validModes = new Set(Object.values(SUSPENSION_MODES))

export class SuspensionMode
{
    constructor({
        storage = globalThis.localStorage,
        inputs = null,
        notifications = null,
    } = {})
    {
        this.storage = storage
        this.inputs = inputs
        this.notifications = notifications
        this.events = new Events()
        this.current = this.read()

        if(this.inputs)
            this.setInput()
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

    setInput()
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
        try
        {
            this.storage?.setItem(STORAGE_KEY, next)
        }
        catch
        {
            // Memory state remains authoritative when storage is unavailable.
        }

        this.events.trigger('change', [ next ])
        this.showNotification(next)
        return true
    }

    toggle()
    {
        return this.set(
            this.current === SUSPENSION_MODES.REALISTIC
                ? SUSPENSION_MODES.FUN
                : SUSPENSION_MODES.REALISTIC,
        )
    }

    showNotification(mode)
    {
        if(!this.notifications)
            return

        const label = mode === SUSPENSION_MODES.REALISTIC ? '写实' : '娱乐'
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

- [ ] **Step 4: 在 `Game.js` 初始化组件**

在 imports 增加：

```js
import { SuspensionMode } from './Vehicle/SuspensionMode.js'
```

在 `this.notifications = new Notifications()` 之后、`new Options()` 之前增加：

```js
this.suspensionMode = new SuspensionMode({
    storage: globalThis.localStorage,
    inputs: this.inputs,
    notifications: this.notifications,
})
```

- [ ] **Step 5: 运行测试并检查 H 键仍由 Player 独占**

Run:

```bash
npm run test:vehicle
node --check sources/Game/Game.js
node --check sources/Game/Vehicle/SuspensionMode.js
```

Expected: 全部 PASS；`Player.js` 中 `Keyboard.KeyH` 映射未改动。

- [ ] **Step 6: 提交**

```bash
git add sources/Game/Game.js sources/Game/Vehicle/SuspensionMode.js tests/vehicle/SuspensionMode.test.js
git commit -m "feat: add persistent suspension modes"
```

---

### Task 3: 增加设置菜单并保持 UI 与快捷键同步

**Files:**
- Modify: `sources/index.html:240-309`
- Modify: `sources/Game/Options.js:7-119`
- Modify: `sources/i18n-zh.js`

**Interfaces:**
- Consumes: `game.suspensionMode.current`、`.toggle()`、`.events.on('change')`。
- Produces: `.js-suspension-mode` 设置按钮。

- [ ] **Step 1: 在设置表格中加入新行**

在 `Renderer` 行之前插入：

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

- [ ] **Step 2: 在中文翻译表加入词条**

```js
"Suspension mode": "悬架模式",
"Press J to toggle": "按 J 键切换",
"Realistic": "写实",
"Fun": "娱乐",
"Suspension mode: Realistic": "悬架模式：写实",
"Suspension mode: Fun": "悬架模式：娱乐",
```

- [ ] **Step 3: 在 `Options` 构造函数调用 `setSuspensionMode()`**

```js
this.setQuality()
this.setSuspensionMode()
this.setRespawn()
```

- [ ] **Step 4: 实现 `Options.setSuspensionMode()`**

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

- [ ] **Step 5: 验证 DOM 和语法**

Run:

```bash
node --check sources/Game/Options.js
node --check sources/i18n-zh.js
npm run build
```

Expected: build PASS；构建产物中存在 `js-suspension-mode`；点击按钮与按 `J` 都更新同一文本。

- [ ] **Step 6: 提交**

```bash
git add sources/index.html sources/Game/Options.js sources/i18n-zh.js
git commit -m "feat: add suspension mode controls"
```

---

### Task 4: 让资源加载器支持 SU7 可选资源和原车回退

**Files:**
- Create: `sources/Game/Vehicle/VehicleModelContract.js`
- Create: `tests/vehicle/VehicleModelContract.test.js`
- Modify: `sources/Game/ResourcesLoader.js:57-124`
- Modify: `sources/Game/Game.js:99-181`
- Modify: `sources/Game/World/World.js:49-60`

**Interfaces:**
- Produces: `inspectVehicleModel(root)`、`selectVehicleModel(primary, fallback, logger)`。
- Resource tuple extension: `[name, path, type, modifier, { optional: true }]`。

- [ ] **Step 1: 写失败测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
    inspectVehicleModel,
    selectVehicleModel,
} from '../../sources/Game/Vehicle/VehicleModelContract.js'

function tree(names)
{
    return {
        name: 'root',
        traverse(callback)
        {
            callback(this)
            for(const name of names)
                callback({ name })
        },
    }
}

const required = [
    'chassis',
    'bodyPainted',
    'wheelContainer',
    'wheelSuspension',
    'wheelCylinder',
    'wheelPainted',
]

test('accepts complete vehicle and reports missing optional nodes separately', () =>
{
    const result = inspectVehicleModel(tree(required))
    assert.equal(result.valid, true)
    assert.deepEqual(result.missingRequired, [])
    assert.ok(result.missingOptional.includes('backLights'))
})

test('rejects missing required nodes and selects fallback', () =>
{
    const primary = tree([ 'chassis' ])
    const fallback = tree(required)
    assert.equal(selectVehicleModel(primary, fallback).model, fallback)
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test:vehicle`

Expected: FAIL，缺少 `VehicleModelContract.js`。

- [ ] **Step 3: 创建契约验证器**

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

export function inspectVehicleModel(root)
{
    const names = new Set()
    root?.traverse?.(child => names.add(child.name))

    const missingRequired = REQUIRED.filter(name => !names.has(name))
    const missingOptional = OPTIONAL.filter(name => !names.has(name))

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

    logger.warn?.(
        `SU7 vehicle fallback: missing ${primaryResult.missingRequired.join(', ') || 'resource'}`,
    )

    const fallbackResult = inspectVehicleModel(fallback)
    if(!fallback || !fallbackResult.valid)
        throw new Error(`Fallback vehicle is invalid: ${fallbackResult.missingRequired.join(', ')}`)

    return { model: fallback, source: 'default', inspection: fallbackResult }
}
```

- [ ] **Step 4: 扩展 `ResourcesLoader` 可选错误处理**

在 `error` 函数中读取 `_file[4]`：

```js
const error = (_file) =>
{
    const options = _file[4] ?? {}
    console.log(`Resources > Couldn't load file ${_file[1]}`)

    if(options.optional)
    {
        loadedResources[_file[0]] = null
        progress()
        return
    }

    reject(_file[1])
}
```

- [ ] **Step 5: 在 `Game.js` 同时加载 SU7 和回退模型**

替换原 `vehicle` 资源项：

```js
[ 'vehicleSu7', `vehicle/su7${compressedModelSuffix}.glb${cb}`, 'gltf', undefined, { optional: true } ],
[ 'vehicleFallback', `vehicle/default${compressedModelSuffix}.glb${cb}`, 'gltf' ],
```

- [ ] **Step 6: 在 `World.js` 选择模型**

增加 import：

```js
import { selectVehicleModel } from '../Vehicle/VehicleModelContract.js'
```

替换车辆创建：

```js
const vehicleSelection = selectVehicleModel(
    this.game.resources.vehicleSu7?.scene ?? null,
    this.game.resources.vehicleFallback.scene,
)

this.vehicleSource = vehicleSelection.source
this.visualVehicle = new VisualVehicle(vehicleSelection.model)
```

- [ ] **Step 7: 运行测试和构建**

```bash
npm run test:vehicle
npm run build
```

Expected: tests PASS；SU7 文件缺失时 build 仍成功，浏览器运行时加载原车且控制台打印一次 fallback 警告。

- [ ] **Step 8: 提交**

```bash
git add sources/Game/Vehicle/VehicleModelContract.js tests/vehicle/VehicleModelContract.test.js sources/Game/ResourcesLoader.js sources/Game/Game.js sources/Game/World/World.js
git commit -m "feat: add validated vehicle fallback"
```

---

### Task 5: 生成雅灰低多边形 SU7 GLB

**Files:**
- Create: `scripts/vehicle/generate-su7.py`
- Create: `static/vehicle/su7.glb`
- Create: `static/vehicle/su7-compressed.glb`
- Modify: `package.json`

**Interfaces:**
- Produces: 满足 `VehicleModelContract` 的 GLB 节点树。
- Consumers: `Game.js` 资源加载、`VisualVehicle`。

- [ ] **Step 1: 在 `package.json` 增加可重复命令**

```json
{
  "scripts": {
    "vehicle:generate": "blender --background --python scripts/vehicle/generate-su7.py",
    "vehicle:compress": "gltf-transform optimize static/vehicle/su7.glb static/vehicle/su7-compressed.glb --compress draco",
    "vehicle:inspect": "gltf-transform inspect static/vehicle/su7-compressed.glb"
  }
}
```

保留现有脚本，并将这三个字段合并进同一个 `scripts` 对象。

- [ ] **Step 2: 创建 Blender 生成脚本基础结构**

```python
import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'static' / 'vehicle' / 'su7.glb'

YAGREY = (0.32, 0.34, 0.35, 1.0)
DARK = (0.025, 0.03, 0.035, 1.0)
GLASS = (0.04, 0.08, 0.10, 0.72)
WHITE = (1.0, 1.0, 1.0, 1.0)
RED = (1.0, 0.015, 0.01, 1.0)
AMBER = (1.0, 0.30, 0.01, 1.0)


def reset_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def material(name, color, metallic=0.0, roughness=0.65, emission=None):
    value = bpy.data.materials.new(name)
    value.diffuse_color = color
    value.use_nodes = True
    bsdf = value.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Alpha'].default_value = color[3]
    value.surface_render_method = 'DITHERED' if color[3] < 1 else 'DITHERED'
    if emission:
        bsdf.inputs['Emission Color'].default_value = emission
        bsdf.inputs['Emission Strength'].default_value = 3.0
    return value


def beveled_cube(name, location, dimensions, mat, bevel=0.08):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new('lowPolyBevel', 'BEVEL')
    modifier.width = bevel
    modifier.segments = 1
    obj.data.materials.append(mat)
    return obj


def cylinder(name, location, radius, depth, mat, vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=(math.pi / 2, 0, 0),
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def join(name, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    objects[0].name = name
    return objects[0]


def parent(child, parent_obj):
    child.parent = parent_obj
    child.matrix_parent_inverse = parent_obj.matrix_world.inverted()
```

- [ ] **Step 3: 在同一脚本创建节点契约和 SU7 轮廓**

```python
def build_vehicle():
    body_mat = material('雅灰', YAGREY, metallic=0.38, roughness=0.52)
    dark_mat = material('轮胎与底盘', DARK, metallic=0.05, roughness=0.82)
    glass_mat = material('玻璃', GLASS, metallic=0.05, roughness=0.18)
    white_mat = material('前灯', WHITE, roughness=0.25, emission=WHITE)
    red_mat = material('尾灯', RED, roughness=0.28, emission=RED)
    amber_mat = material('转向灯', AMBER, roughness=0.28, emission=AMBER)

    root = bpy.data.objects.new('vehicleRoot', None)
    bpy.context.collection.objects.link(root)

    chassis = bpy.data.objects.new('chassis', None)
    bpy.context.collection.objects.link(chassis)
    parent(chassis, root)

    body_parts = [
        beveled_cube('bodyLower', (0.00, 0.00, 0.63), (4.58, 1.82, 0.54), body_mat, 0.16),
        beveled_cube('bodyShoulder', (-0.08, 0.00, 0.94), (3.82, 1.70, 0.34), body_mat, 0.18),
        beveled_cube('hood', (1.43, 0.00, 1.08), (1.55, 1.66, 0.20), body_mat, 0.12),
        beveled_cube('duckTail', (-2.05, 0.00, 1.10), (0.34, 1.55, 0.13), body_mat, 0.06),
    ]
    body = join('bodyPainted', body_parts)
    parent(body, chassis)

    glass = beveled_cube('glass', (-0.38, 0.00, 1.35), (2.20, 1.42, 0.56), glass_mat, 0.24)
    glass.scale.x = 1.0
    parent(glass, chassis)

    headlights = join('headlights', [
        beveled_cube('headlightLeft', (2.18, -0.60, 0.96), (0.10, 0.38, 0.13), white_mat, 0.04),
        beveled_cube('headlightRight', (2.18, 0.60, 0.96), (0.10, 0.38, 0.13), white_mat, 0.04),
    ])
    parent(headlights, chassis)

    back_lights = beveled_cube('backLights', (-2.27, 0.00, 1.03), (0.08, 1.48, 0.10), red_mat, 0.03)
    stop_lights = back_lights.copy()
    stop_lights.data = back_lights.data.copy()
    stop_lights.name = 'stopLights'
    bpy.context.collection.objects.link(stop_lights)
    stop_lights.location.x -= 0.01
    parent(back_lights, chassis)
    parent(stop_lights, chassis)

    blinker_left = beveled_cube('blinkerLeft', (-2.29, -0.78, 1.01), (0.06, 0.10, 0.10), amber_mat, 0.02)
    blinker_right = beveled_cube('blinkerRight', (-2.29, 0.78, 1.01), (0.06, 0.10, 0.10), amber_mat, 0.02)
    parent(blinker_left, chassis)
    parent(blinker_right, chassis)

    wheel_container = bpy.data.objects.new('wheelContainer', None)
    bpy.context.collection.objects.link(wheel_container)
    parent(wheel_container, chassis)

    wheel_suspension = bpy.data.objects.new('wheelSuspension', None)
    bpy.context.collection.objects.link(wheel_suspension)
    parent(wheel_suspension, wheel_container)

    wheel_cylinder = cylinder('wheelCylinder', (0, 0, 0), 0.43, 0.24, dark_mat, vertices=16)
    parent(wheel_cylinder, wheel_suspension)

    wheel_painted = cylinder('wheelPainted', (0, 0, 0), 0.30, 0.255, body_mat, vertices=12)
    parent(wheel_painted, wheel_suspension)

    return root
```

- [ ] **Step 4: 在脚本结尾导出 GLB**

```python
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

- [ ] **Step 5: 生成、压缩并检查模型**

Run:

```bash
npm run vehicle:generate
npm run vehicle:compress
npm run vehicle:inspect
```

Expected:

- 两个 GLB 均存在。
- inspect 输出中包含全部必需节点。
- 压缩模型小于 5 MiB。
- 三角面不超过 30,000。
- 材质不超过 8。

- [ ] **Step 6: 提交模型和生成脚本**

```bash
git add package.json scripts/vehicle/generate-su7.py static/vehicle/su7.glb static/vehicle/su7-compressed.glb
git commit -m "feat: add low-poly Xiaomi SU7 model"
```

---

### Task 6: 让 `VisualVehicle` 兼容 SU7 节点、雅灰车漆和挂点

**Files:**
- Modify: `sources/Game/World/VisualVehicle.js:63-129, 131-249, 352-387`

**Interfaces:**
- Consumes: `VEHICLE_PROFILE.effects`、经过验证的车辆模型。
- Produces: 可选灯节点安全访问、正确尾迹位置、SU7 默认雅灰材质。

- [ ] **Step 1: 导入车辆配置**

```js
import { VEHICLE_PROFILE } from '../Vehicle/VehicleProfiles.js'
```

- [ ] **Step 2: 在 `setParts()` 中增加必需节点防御**

在 traverse 之后增加：

```js
for(const requiredName of [ 'chassis', 'bodyPainted', 'wheelContainer' ])
{
    if(!this.parts[requiredName])
        throw new Error(`Vehicle model missing required visual node: ${requiredName}`)
}
```

- [ ] **Step 3: 将可选车轮涂装和灯节点全部改为条件访问**

保持现有 `if(this.parts.blinkerLeft)`、`if(this.parts.stopLights)` 风格；在 `setWheels()` 中增加：

```js
if(!wheel.suspension || !wheel.cylinder)
    throw new Error('Vehicle wheelContainer must contain wheelSuspension and wheelCylinder')
```

- [ ] **Step 4: 雅灰作为默认车身颜色**

在 `setPaints()` 添加：

```js
this.paints.choices.su7Grey = this.game.materials.createGradient(
    'su7GreyGradient',
    '#6f7375',
    '#303437',
    this.game.materials.debugPanel?.addFolder({ title: 'su7GreyGradient' }),
)
```

首次加载时，如果当前成就奖励名称为默认 `red`，改用：

```js
const initialPaint = this.game.achievements.rewards.current.name === 'red'
    ? 'su7Grey'
    : this.game.achievements.rewards.current.name
this.paints.changeTo(initialPaint)
```

奖励切换逻辑仍保持原名称，不删除已有奖励。

- [ ] **Step 5: 更新尾迹挂点**

```js
const { boostLeft, boostRight } = VEHICLE_PROFILE.effects
this.boostTrails.leftReference.position.set(boostLeft.x, boostLeft.y, boostLeft.z)
this.boostTrails.rightReference.position.set(boostRight.x, boostRight.y, boostRight.z)
```

- [ ] **Step 6: 运行语法和构建验证**

```bash
node --check sources/Game/World/VisualVehicle.js
npm run build
```

Expected: PASS；浏览器中车轮、转向灯、刹车灯和尾迹无运行时异常。

- [ ] **Step 7: 提交**

```bash
git add sources/Game/World/VisualVehicle.js
git commit -m "feat: adapt visual vehicle to SU7"
```

---

### Task 7: 应用 SU7 碰撞体、轮位与双悬架物理参数

**Files:**
- Modify: `sources/Game/Physics/PhysicsVehicle.js:16-203`
- Modify: `sources/Game/Player.js:41-150`
- Modify: `sources/Game/View.js:118-172, 250-359`

**Interfaces:**
- Consumes: `VEHICLE_PROFILE`、`getSuspensionProfile()`、`game.suspensionMode.current`。
- Produces: `PhysicsVehicle.applySuspensionMode(mode)`。

- [ ] **Step 1: 在 `PhysicsVehicle` 导入配置并移除内联参数**

```js
import {
    VEHICLE_PROFILE,
    getSuspensionProfile,
} from '../Vehicle/VehicleProfiles.js'
```

构造函数中使用：

```js
const initialSuspension = getSuspensionProfile(this.game.suspensionMode.current)
this.suspensionsHeights = { ...initialSuspension.heights }
this.suspensionsStiffness = { ...initialSuspension.stiffness }
```

- [ ] **Step 2: 使用集中碰撞体**

在 `setChassis()` 中：

```js
colliders: VEHICLE_PROFILE.colliders.map(collider => ({
    ...collider,
    parameters: [ ...collider.parameters ],
    position: { ...collider.position },
    centerOfMass: collider.centerOfMass ? { ...collider.centerOfMass } : undefined,
})),
```

- [ ] **Step 3: 使用集中轮位和半径**

```js
this.wheels.settings = {
    offset: { ...VEHICLE_PROFILE.wheels.offset },
    radius: VEHICLE_PROFILE.wheels.radius,
    directionCs: { x: 0, y: -1, z: 0 },
    axleCs: { x: 0, y: 0, z: 1 },
    frictionSlip: 0.9,
    maxSuspensionForce: initialSuspension.maxSuspensionForce,
    maxSuspensionTravel: initialSuspension.maxSuspensionTravel,
    sideFrictionStiffness: initialSuspension.sideFrictionStiffness,
    suspensionCompression: initialSuspension.suspensionCompression,
    suspensionRelaxation: initialSuspension.suspensionRelaxation,
    suspensionStiffness: initialSuspension.stiffness.mid,
}
```

- [ ] **Step 4: 实现 `applySuspensionMode(mode)`**

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

在 wheels 创建完成后注册：

```js
this.game.suspensionMode.events.on('change', mode =>
{
    this.applySuspensionMode(mode)
})
```

同时为每个 wheel 调用现有 controller setters，确保 `updateSettings()` 写入新参数。

- [ ] **Step 5: 在 `Player` 根据模式选择动作状态**

导入：

```js
import { getSuspensionProfile } from './Vehicle/VehicleProfiles.js'
```

替换 `activeState`：

```js
const profile = getSuspensionProfile(this.game.suspensionMode.current)
const allWheelsActive = this.game.inputs.actions.get('suspensions').active
const activeState = allWheelsActive
    ? profile.allWheelsActiveState
    : profile.partialActiveState
```

触屏 tap 中：

```js
const tapState = getSuspensionProfile(this.game.suspensionMode.current).allWheelsActiveState
for(let i = 0; i < 4; i++)
    this.suspensions[i] = tapState
```

- [ ] **Step 6: 在 `View` 使用 SU7 相机配置**

导入：

```js
import { VEHICLE_PROFILE } from './Vehicle/VehicleProfiles.js'
```

修改 focus height：

```js
this.focusPoint.trackedPosition = new THREE.Vector3(
    defaultRespawn.position.x,
    VEHICLE_PROFILE.camera.focusHeight,
    defaultRespawn.position.z,
)
```

修改 spherical 参数：

```js
this.spherical.radius.edges = { ...VEHICLE_PROFILE.camera.radiusEdges }
this.spherical.radius.nonIdealRatioOffset = VEHICLE_PROFILE.camera.nonIdealRatioOffset
```

- [ ] **Step 7: 运行全部自动验证**

```bash
npm run test:vehicle
node --check sources/Game/Physics/PhysicsVehicle.js
node --check sources/Game/Player.js
node --check sources/Game/View.js
npm run build
```

Expected: 全部 PASS；写实模式使用 `mid` 而不是 `high` 进行四轮动作；娱乐模式保持原 `high` 跳跃。

- [ ] **Step 8: 提交**

```bash
git add sources/Game/Physics/PhysicsVehicle.js sources/Game/Player.js sources/Game/View.js
git commit -m "feat: tune SU7 physics and suspension"
```

---

### Task 8: 浏览器视觉校准、性能预算和 Cloudflare 验收

**Files:**
- Modify as needed only: `sources/Game/Vehicle/VehicleProfiles.js`
- Modify as needed only: `scripts/vehicle/generate-su7.py`
- Regenerate as needed: `static/vehicle/su7.glb`
- Regenerate as needed: `static/vehicle/su7-compressed.glb`
- Update: `docs/superpowers/specs/2026-07-23-xiaomi-su7-vehicle-design.md` status only after acceptance

**Interfaces:**
- Final deliverable: 可部署、可驾驶、可回退的 SU7 版本。

- [ ] **Step 1: 启动开发环境并记录基准**

```bash
npm clean-install
npm run dev
```

Expected: 首页加载完成；控制台无 uncaught exception；默认显示 SU7。

- [ ] **Step 2: 检查模型契约和尺寸**

在浏览器控制台确认：

```js
game.world.vehicleSource
```

Expected: `"su7"`。

检查：

- 四轮接地且中心与轮拱基本一致。
- 前轮转向时不穿出车体。
- 车身碰撞体不明显超出前后保险杠。
- 相机在默认、缩放和移动端比例下不穿车。
- 前灯、尾灯、转向灯、刹车灯和尾迹位置正确。

- [ ] **Step 3: 检查双悬架模式**

操作序列：

```text
刷新页面 → 默认写实
Space → 轻微升降，不高跳
J → 通知“悬架模式：娱乐”
Space → 原版夸张弹跳
数字键盘 1–9 → 独立悬架有效
H → 只鸣笛，不切换模式
刷新页面 → 保持娱乐
J → 切回写实
```

Expected: 所有步骤符合描述，设置菜单文字实时同步。

- [ ] **Step 4: 验证回退路径**

临时将 `Game.js` 中 SU7 路径改为不存在文件：

```js
`vehicle/su7-missing${compressedModelSuffix}.glb${cb}`
```

Run: `npm run dev`

Expected: 页面仍加载原车；`game.world.vehicleSource === 'default'`；控制台只有明确 fallback 日志。验证后立即恢复路径，不能提交临时改动。

- [ ] **Step 5: 检查模型与 Cloudflare 限制**

```bash
npm run vehicle:inspect
find static -type f -size +25M -print
npm run build
find dist -type f -size +25M -print
```

Expected:

- 两次 `find` 均无输出。
- `su7-compressed.glb` 小于 5 MiB。
- `npm run build` PASS。

Windows PowerShell 等价命令：

```powershell
Get-ChildItem static -Recurse -File | Where-Object Length -GT 25MB
Get-ChildItem dist -Recurse -File | Where-Object Length -GT 25MB
```

Expected: 无输出。

- [ ] **Step 6: 部署预览分支并检查网络资源**

推送功能分支后，等待 Cloudflare preview deployment。检查：

```text
/vehicle/su7-compressed.glb         200
/vehicle/default-compressed.glb     200
```

Expected: Wrangler 上传成功；无 `Asset too large`；首屏和车辆模型均可加载。

- [ ] **Step 7: 最终全量验证**

```bash
npm run test
npm run build
git status --short
```

Expected:

- tests 全部 PASS。
- build PASS。
- `git status --short` 无输出。

- [ ] **Step 8: 创建 PR**

```bash
git push -u origin feat/xiaomi-su7-vehicle
gh pr create \
  --base main \
  --head feat/xiaomi-su7-vehicle \
  --title "feat: replace vehicle with low-poly Xiaomi SU7" \
  --body "Adds an 雅灰 low-poly Xiaomi SU7 Pro, validated fallback, SU7 physics tuning, and persistent realistic/fun suspension modes with J-key and settings controls."
```

PR 验收必须附：

- 桌面端前／后／侧三张截图。
- 移动端一张截图。
- 写实与娱乐模式各一段短视频或 GIF。
- `npm run test` 和 `npm run build` 输出。
- Cloudflare 预览 URL。

- [ ] **Step 9: 验收后更新设计状态并提交**

把设计文档第 6 行：

```text
状态：待用户最终审阅
```

改为：

```text
状态：已实现并验收
```

提交：

```bash
git add docs/superpowers/specs/2026-07-23-xiaomi-su7-vehicle-design.md
git commit -m "docs: mark SU7 design implemented"
```
