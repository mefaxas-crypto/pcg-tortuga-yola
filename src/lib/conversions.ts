/**
 * @fileOverview A library of functions for converting between different units of measurement.
 * This library handles weight, volume, and will be expanded to handle item-specific densities.
 */

// --- Weight Conversions ---
const GRAMS_PER_OUNCE = 28.3495;
const GRAMS_PER_POUND = 453.592;

export function gramsToOunces(grams: number): number {
  return grams / GRAMS_PER_OUNCE;
}

export function ouncesToGrams(ounces: number): number {
  return ounces * GRAMS_PER_OUNCE;
}

export function gramsToPounds(grams: number): number {
  return grams / GRAMS_PER_POUND;
}

export function poundsToGrams(pounds: number): number {
  return pounds * GRAMS_PER_POUND;
}

export function kilogramsToPounds(kg: number): number {
  return kg * 2.20462;
}

export function poundsToKilograms(lb: number): number {
  return lb / 2.20462;
}


// --- Volume Conversions ---
const ML_PER_FL_OZ = 29.5735;
const ML_PER_CUP = 236.588;
const ML_PER_LITER = 1000;

export function mlToFluidOunces(ml: number): number {
  return ml / ML_PER_FL_OZ;
}

export function fluidOuncesToMl(flOz: number): number {
  return flOz * ML_PER_FL_OZ;
}

export function mlToCups(ml: number): number {
  return ml / ML_PER_CUP;
}

export function cupsToMl(cups: number): number {
  return cups * ML_PER_CUP;
}

export function litersToMilliliters(liters: number): number {
  return liters * ML_PER_LITER;
}

export function millilitersToLiters(ml: number): number {
  return ml / ML_PER_LITER;
}

// --- Density-Based Conversions (Placeholder) ---
// To accurately convert between weight and volume (e.g., grams to cups),
// we need the density of the specific ingredient. This is a placeholder
// for where that logic will go. We will need a database of ingredient densities.
// Example: 1 cup of flour is ~120g, but 1 cup of sugar is ~200g.

/**
 * Converts a volume to a weight, given a specific ingredient's density.
 * @param volume The volume amount (e.g., 1).
 * @param volumeUnit The unit of the volume (e.g., 'cup').
 * @param weightUnit The target unit for the weight (e.g., 'g').
 * @param ingredientDensityGramsPerMl The density of the ingredient in g/mL.
 * @returns The converted weight.
 */
export function convertVolumeToWeight(
    volume: number,
    volumeUnit: string, // e.g., 'cup', 'l', 'fl-oz'
    weightUnit: string, // e.g., 'g', 'kg', 'lb'
    ingredientDensityGramsPerMl: number
): number {
    // This function will be implemented once we have a density database.
    // For now, it's a placeholder.
    console.warn("convertVolumeToWeight is not yet implemented.");
    return 0;
}
