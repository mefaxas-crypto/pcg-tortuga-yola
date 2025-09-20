'use server';
/**
 * @fileOverview Provides AI-driven recipe suggestions based on current inventory to minimize waste and maximize resource utilization.
 *
 * - suggestRecipesFromInventory - A function that suggests recipes based on the current inventory.
 * - SuggestRecipesFromInventoryInput - The input type for the suggestRecipesFromInventory function.
 * - SuggestRecipesFromInventoryOutput - The return type for the suggestRecipesFromInventory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRecipesFromInventoryInputSchema = z.object({
  inventory: z
    .array(z.string())
    .describe('A list of food items currently in the inventory.'),
  dietaryRestrictions: z
    .string()
    .optional()
    .describe('Any dietary restrictions to consider, e.g., vegetarian, gluten-free.'),
  numRecipes: z
    .number()
    .optional()
    .default(3)
    .describe('The number of recipe suggestions to return.'),
});
export type SuggestRecipesFromInventoryInput = z.infer<
  typeof SuggestRecipesFromInventoryInputSchema
>;

const SuggestRecipesFromInventoryOutputSchema = z.object({
  recipes: z
    .array(z.string())
    .describe('A list of recipe suggestions based on the current inventory.'),
});
export type SuggestRecipesFromInventoryOutput = z.infer<
  typeof SuggestRecipesFromInventoryOutputSchema
>;

export async function suggestRecipesFromInventory(
  input: SuggestRecipesFromInventoryInput
): Promise<SuggestRecipesFromInventoryOutput> {
  return suggestRecipesFromInventoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRecipesFromInventoryPrompt',
  input: {schema: SuggestRecipesFromInventoryInputSchema},
  output: {schema: SuggestRecipesFromInventoryOutputSchema},
  prompt: `You are a chef specializing in minimizing food waste. Given the current inventory, suggest recipes that utilize the ingredients efficiently.

Current Inventory:
{{#each inventory}}- {{this}}\n{{/each}}

{{#if dietaryRestrictions}}
Dietary Restrictions: {{dietaryRestrictions}}
{{/if}}

Suggest {{numRecipes}} recipes that can be made with the current inventory.  Provide only the names of the recipes.
`,
});

const suggestRecipesFromInventoryFlow = ai.defineFlow(
  {
    name: 'suggestRecipesFromInventoryFlow',
    inputSchema: SuggestRecipesFromInventoryInputSchema,
    outputSchema: SuggestRecipesFromInventoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
