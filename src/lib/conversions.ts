

/**
 * @fileOverview A library of functions for converting between different units of measurement.
 * This library handles weight, volume, and will be expanded to handle item-specific densities.
 */

// --- Base Units ---
const BASE_WEIGHT_UNIT = 'g';
const BASE_VOLUME_UNIT = 'ml';

// --- Unit Definitions ---
// The key is the internal identifier, the name is for display.
// prettier-ignore
export const allUnits = {
  'kg':   { name: 'Kg',      type: 'weight', factor: 1000 },
  'g':    { name: 'g',       type: 'weight', factor: 1 },
  'lbs':  { name: 'lbs',     type: 'weight', factor: 453.592 },
  'oz':   { name: 'oz',      type: 'weight', factor: 28.3495 },
  'lt':   { name: 'Lt',      type: 'volume', factor: 1000 },
  'ml':   { name: 'mL',      type: 'volume', factor: 1 },
  'floz': { name: 'fl. oz',  type: 'volume', factor: 29.5735 },
  'un.':  { name: 'un.',     type: 'each',   factor: 1 },
};

export type Unit = keyof typeof allUnits;


/**
 * Determines the fundamental base unit for a given unit (e.g., 'kg' -> 'g').
 * @param unit The unit to find the base for.
 * @returns The base unit ('g', 'ml', or 'un.').
 */
export function getBaseUnit(unit: Unit): Unit {
    const unitInfo = allUnits[unit];
    if (!unitInfo) {
        // Fallback for safety, though this should ideally not be reached
        // if all inputs are validated against `allUnits`.
        return 'un.';
    }
    if (unitInfo.type === 'weight') return BASE_WEIGHT_UNIT;
    if (unitInfo.type === 'volume') return BASE_VOLUME_UNIT;
    return 'un.'; // For 'each' type
}


/**
 * Converts a value from one unit to another.
 *
 * @param value The numerical value to convert.
 * @param fromUnit The unit to convert from (e.g., 'kg').
 * @param toUnit The unit to convert to (e.g., 'g').
 * @param densityInGramsPerMl Optional density for volume-to-weight conversions.
 * @returns The converted value, or throws an error if conversion is not possible.
 */
export function convert(
  value: number,
  fromUnit: Unit,
  toUnit: Unit,
  densityInGramsPerMl?: number
): number {
  if (fromUnit === toUnit) {
    return value;
  }

  const from = allUnits[fromUnit];
  const to = allUnits[toUnit];

  if (!from || !to) {
    throw new Error(`Invalid unit specified. From: ${fromUnit}, To: ${toUnit}`);
  }

  // --- Direct Conversion (Weight-Weight, Volume-Volume, Each-Each) ---
  if (from.type === to.type) {
    if (from.type === 'each') return value; // 'un.' to 'un.' is 1:1, anything else is invalid
    const valueInBaseUnit = value * from.factor;
    return valueInBaseUnit / to.factor;
  }

  // --- Density-based Conversion (Volume-Weight or Weight-Volume) ---
  if (!densityInGramsPerMl || densityInGramsPerMl <= 0) {
    throw new Error(
      `Conversion between ${from.type} and ${to.type} requires a valid density.`
    );
  }

  // Convert to base units (g, ml) first
  let valueInGrams: number;
  let valueInMl: number;

  if (from.type === 'weight') {
    valueInGrams = convert(value, fromUnit, BASE_WEIGHT_UNIT as Unit);
    valueInMl = valueInGrams / densityInGramsPerMl;
  } else if (from.type === 'volume') {
    valueInMl = convert(value, fromUnit, BASE_VOLUME_UNIT as Unit);
    valueInGrams = valueInMl * densityInGramsPerMl;
  } else {
    throw new Error(`Cannot convert from unit type '${from.type}'.`);
  }

  // Convert from base unit to target unit
  if (to.type === 'weight') {
    return convert(valueInGrams, BASE_WEIGHT_UNIT as Unit, toUnit);
  } else if (to.type === 'volume') {
    return convert(valueInMl, BASE_VOLUME_UNIT as Unit, toUnit);
  }

  throw new Error(
    `Conversion from '${fromUnit}' to '${toUnit}' is not supported.`
  );
}
