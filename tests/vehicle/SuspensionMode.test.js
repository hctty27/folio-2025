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
        values,
    }
}

function createInputs()
{
    const listeners = new Map()
    return {
        added: [],
        addActions(actions){ this.added.push(...actions) },
        events: { on(name, callback){ listeners.set(name, callback) } },
        trigger(name, action){ listeners.get(name)?.(action) },
    }
}

test('defaults to realistic and restores valid persisted mode', () =>
{
    assert.equal(new SuspensionMode({ storage: createStorage() }).current, SUSPENSION_MODES.REALISTIC)
    assert.equal(new SuspensionMode({ storage: createStorage({ vehicleSuspensionMode: 'fun' }) }).current, SUSPENSION_MODES.FUN)
    assert.equal(new SuspensionMode({ storage: createStorage({ vehicleSuspensionMode: 'bad' }) }).current, SUSPENSION_MODES.REALISTIC)
})

test('J action toggles once and does not replace H horn mapping', () =>
{
    const inputs = createInputs()
    const mode = new SuspensionMode({ storage: createStorage(), inputs })
    assert.deepEqual(inputs.added[0].keys, [ 'Keyboard.KeyJ' ])
    inputs.trigger('suspensionModeToggle', { active: false })
    assert.equal(mode.current, 'realistic')
    inputs.trigger('suspensionModeToggle', { active: true })
    assert.equal(mode.current, 'fun')
})

test('set persists, emits change and shows Chinese notification', () =>
{
    const storage = createStorage()
    const notifications = { calls: [], show(...args){ this.calls.push(args) } }
    const mode = new SuspensionMode({ storage, notifications })
    const changes = []
    mode.events.on('change', value => changes.push(value))
    assert.equal(mode.set('fun'), true)
    assert.equal(storage.values.get('vehicleSuspensionMode'), 'fun')
    assert.deepEqual(changes, [ 'fun' ])
    assert.match(notifications.calls[0][0], /悬架模式：娱乐/)
})
