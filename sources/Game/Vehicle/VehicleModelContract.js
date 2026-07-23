export const REQUIRED_VEHICLE_NODE_PREFIXES = Object.freeze([
    'chassis',
    'bodyPainted',
    'wheelContainer',
    'wheelSuspension',
    'wheelCylinder',
    'wheelPainted',
])

export const OPTIONAL_VEHICLE_NODE_PREFIXES = Object.freeze([
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

export function collectVehicleNodeNames(model)
{
    const names = []
    model?.traverse?.((child) =>
    {
        if(typeof child?.name === 'string' && child.name.length)
            names.push(child.name)
    })
    return names
}

function hasPrefix(names, prefix)
{
    const expression = new RegExp(`^${prefix}`, 'i')
    return names.some(name => expression.test(name))
}

export function validateVehicleModel(model)
{
    const names = collectVehicleNodeNames(model)
    const missingRequired = REQUIRED_VEHICLE_NODE_PREFIXES.filter(prefix => !hasPrefix(names, prefix))
    const availableOptional = OPTIONAL_VEHICLE_NODE_PREFIXES.filter(prefix => hasPrefix(names, prefix))
    return { valid: missingRequired.length === 0, missingRequired, availableOptional, names }
}

export function resolveAntennaRig(vehicleScene, antennaObject)
{
    if(!vehicleScene || !antennaObject)
        return null

    const head = vehicleScene.getObjectByName?.('antennaHead')
    const headAxle = head?.children?.[0]
    const headReference = antennaObject.getObjectByName?.('antennaHeadReference')

    if(!head || !headAxle || !headReference)
        return null

    return {
        object: antennaObject,
        head,
        headAxle,
        headReference,
    }
}

function removeIncompleteOptionalParts(model)
{
    const antenna = model?.getObjectByName?.('antenna')
    if(antenna && !resolveAntennaRig(model, antenna))
        antenna.removeFromParent?.()
}

function prepareSelection(model, source, validation)
{
    removeIncompleteOptionalParts(model)
    return { model, source, validation }
}

export function selectVehicleModel(preferredModel, fallbackModel)
{
    if(preferredModel)
    {
        const preferredValidation = validateVehicleModel(preferredModel)
        if(preferredValidation.valid)
            return prepareSelection(preferredModel, 'su7', preferredValidation)
    }

    const fallbackValidation = validateVehicleModel(fallbackModel)
    if(!fallbackValidation.valid)
        throw new Error(`Fallback vehicle model is invalid: ${fallbackValidation.missingRequired.join(', ')}`)

    return prepareSelection(fallbackModel, 'fallback', fallbackValidation)
}
