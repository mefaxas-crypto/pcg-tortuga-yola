/**
 * @fileOverview A library of functions for converting between different units of measurement.
 * This library handles weight, volume, and will be expanded to handle item-specific densities.
 */

// --- Base Units ---
const BASE_WEIGHT_UNIT = 'g';
const BASE_VOLUME_UNIT = 'ml';

// --- Unit Definitions ---

// prettier-ignore
export const weightUnits = {
  'g':    { name: 'gram', type: 'weight', factor: 1 },
  'kg':   { name: 'kilogram', type: 'weight', factor: 1000 },
  'oz':   { name: 'ounce', type: 'weight', factor: 28.3495 },
  'lb':   { name: 'pound', type: 'weight', factor: 453.592 },
};

// prettier-ignore
export const volumeUnits = {
  'ml':   { name: 'milliliter', type: 'volume', factor: 1 },
  'l':    { name: 'liter', type: 'volume', factor: 1000 },
  'tsp':  { name: 'teaspoon', type: 'volume', factor: 4.92892 },
  'tbsp': { name: 'tablespoon', type: 'volume', factor: 14.7868 },
  'floz': { name: 'fluid ounce', type: 'volume', factor: 29.5735 },
  'cup':  { name: 'cup', type: 'volume', factor: 236.588 },
  'pt':   { name: 'pint', type: 'volume', factor: 473.176 },
  'qt':   { name: 'quart', type: 'volume', factor: 946.353 },
  'gal':  { name: 'gallon', type: 'volume', factor: 3785.41 },
};

// prettier-ignore
export const eachUnits = {
    'each': { name: 'each', type: 'each', factor: 1 },
    'unit': { name: 'unit', type: 'each', factor: 1 },
    'slice': { name: 'slice', type: 'each', factor: 1 },
    'portion': { name: 'portion', type: 'each', factor: 1 },
};

export const allUnits = { ...weightUnits, ...volumeUnits, ...eachUnits };
export type Unit = keyof typeof allUnits;

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
    throw new Error('Invalid unit specified.');
  }

  // --- Direct Conversion (Weight-Weight, Volume-Volume, Each-Each) ---
  if (from.type === to.type) {
    if (from.type === 'each') return value; // 'each' to 'unit' etc. are 1:1 for quantity
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
