'use client';

import { suggestRecipesFromInventory } from '@/ai/flows/suggest-recipes-from-inventory';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bot, ChefHat, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  inventory: z.string().min(1, 'Please list at least one ingredient.'),
});

export function RecipeSuggestions() {
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inventory: 'Tomatoes, Onions, Garlic, Chicken Breast, Olive Oil',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setRecipes([]);
    const inventoryList = values.inventory.split(',').map((item) => item.trim());

    try {
      const result = await suggestRecipesFromInventory({ inventory: inventoryList, numRecipes: 5 });
      setRecipes(result.recipes);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate recipe suggestions. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <CardTitle>Intelligent Recipe Suggestions</CardTitle>
        </div>
        <CardDescription>
          Minimize waste by discovering recipes for your current inventory.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="h-full flex flex-col"
        >
          <CardContent className="flex-grow">
            <FormField
              control={form.control}
              name="inventory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available Ingredients</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Chicken, potatoes, carrots..."
                      className="resize-none h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter ingredients separated by commas.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {recipes.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Recipe Ideas
                </h4>
                <ul className="space-y-2">
                  {recipes.map((recipe, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm p-2 rounded-md bg-secondary/50">
                      <Sparkles className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>{recipe}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Thinking...' : 'Suggest Recipes'}
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
