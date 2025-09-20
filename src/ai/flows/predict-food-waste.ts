'use server';

/**
 * @fileOverview This file defines a Genkit flow for predicting potential food waste.
 *
 * - predictFoodWaste - A function that predicts food waste based on historical data.
 * - PredictFoodWasteInput - The input type for the predictFoodWaste function.
 * - PredictFoodWasteOutput - The return type for the predictFoodWaste function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictFoodWasteInputSchema = z.object({
  historicalData: z
    .string()
    .describe(
      'Historical data of food usage, waste, purchasing, and sales data, in CSV format.'
    ),
  currentInventory: z
    .string()
    .describe('A list of current inventory items and quantities.'),
  outletName: z.string().describe('The name of the kitchen outlet.'),
});
export type PredictFoodWasteInput = z.infer<typeof PredictFoodWasteInputSchema>;

const PredictFoodWasteOutputSchema = z.object({
  predictedWaste: z
    .string()
    .describe(
      'A detailed analysis of predicted food waste, including specific items, quantities, and reasons for potential waste. Also include suggestions for adjustments to inventory and purchasing to minimize waste for the specified outlet.'
    ),
});
export type PredictFoodWasteOutput = z.infer<typeof PredictFoodWasteOutputSchema>;

export async function predictFoodWaste(
  input: PredictFoodWasteInput
): Promise<PredictFoodWasteOutput> {
  return predictFoodWasteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictFoodWastePrompt',
  input: {schema: PredictFoodWasteInputSchema},
  output: {schema: PredictFoodWasteOutputSchema},
  prompt: `You are an AI assistant designed to predict potential food waste in a kitchen and suggest ways to minimize it.

  Analyze the following historical data, current inventory, and outlet name to predict potential food waste. Provide specific items, quantities, reasons for waste, and suggestions for adjustments to minimize waste.

  Outlet Name: {{{outletName}}}
  Historical Data: {{{historicalData}}}
  Current Inventory: {{{currentInventory}}}`,
});

const predictFoodWasteFlow = ai.defineFlow(
  {
    name: 'predictFoodWasteFlow',
    inputSchema: PredictFoodWasteInputSchema,
    outputSchema: PredictFoodWasteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
