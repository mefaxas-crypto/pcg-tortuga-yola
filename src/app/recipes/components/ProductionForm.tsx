
'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { logProduction } from '@/lib/actions';
import { db } from '@/lib/firebase';
import type { Recipe } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Flame } from 'lucide-react';

const formSchema = z.object({
  recipeId: z.string().min(1, 'Please select a sub-recipe.'),
  quantityProduced: z.coerce.number().min(0.01, 'Quantity must be greater than 0.'),
});

export function ProductionForm() {
  const [loading, setLoading] = useState(false);
  const [subRecipes, setSubRecipes] = useState<Recipe[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipeId: '',
      quantityProduced: 1,
    },
  });

  useEffect(() => {
    const q = query(collection(db, 'recipes'), where('isSubRecipe', '==', true));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const recipesData: Recipe[] = [];
      querySnapshot.forEach((doc) => {
        recipesData.push({ id: doc.id, ...doc.data() } as Recipe);
      });
      setSubRecipes(recipesData.sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => unsubscribe();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const selectedRecipe = subRecipes.find(r => r.id === values.recipeId);
    if (!selectedRecipe) return;

    try {
        await logProduction(values);
        toast({
            title: 'Production Logged',
            description: `Inventory updated for the production of ${selectedRecipe.name}.`,
        });
      form.reset({ recipeId: '', quantityProduced: 1 });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log production. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-lg mx-auto">
        <FormField
          control={form.control}
          name="recipeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub-Recipe to Produce</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sub-recipe..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subRecipes.map((recipe) => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantityProduced"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity Produced (in batches)</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Processing...' : 'Log Production'}
          <Flame className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </Form>
  );
}
