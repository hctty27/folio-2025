import { Events } from '../Events.js'
import { SUSPENSION_MODES } from './VehicleProfiles.js'

const STORAGE_KEY = 'vehicleSuspensionMode'

function isValidMode(mode)
{
    return mode === SUSPENSION_MODES.REALISTIC || mode === SUSPENSION_MODES.FUN
}

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
            this.bindInputs()
    }

    read()
    {
        try
        {
            const stored = this.storage?.getItem(STORAGE_KEY)
            return isValidMode(stored) ? stored : SUSPENSION_MODES.REALISTIC
        }
        catch
        {
            return SUSPENSION_MODES.REALISTIC
        }
    }

    persist()
    {
        try
        {
            this.storage?.setItem(STORAGE_KEY, this.current)
        }
        catch
        {
            // Storage may be unavailable in private browsing or sandboxed contexts.
        }
    }

    bindInputs()
    {
        this.inputs.addActions([
            { name: 'suspensionModeToggle', categories: [ 'wandering', 'racing' ], keys: [ 'Keyboard.KeyJ' ] },
        ])

        this.inputs.events.on('suspensionModeToggle', (action) =>
        {
            if(action.active)
                this.toggle()
        })
    }

    set(mode, { notify = true } = {})
    {
        const next = isValidMode(mode) ? mode : SUSPENSION_MODES.REALISTIC
        if(next === this.current)
            return false

        this.current = next
        this.persist()
        this.events.trigger('change', [ this.current ])

        if(notify)
        {
            const label = this.current === SUSPENSION_MODES.REALISTIC ? '写实' : '娱乐'
            this.notifications?.show(`<div class="title">悬架模式：${label}</div>`, 'success', 2, null, 'suspension-mode')
        }

        return true
    }

    toggle(options)
    {
        const next = this.current === SUSPENSION_MODES.REALISTIC
            ? SUSPENSION_MODES.FUN
            : SUSPENSION_MODES.REALISTIC
        this.set(next, options)
        return this.current
    }
}
