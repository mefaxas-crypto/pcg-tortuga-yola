
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { addMenu, editMenu } from '@/lib/actions';
import { useEffect, useState } from 'react';
import type { Menu, Recipe } from '@/lib/types';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { MultiSelect } from '@/components/ui/multi-select';

const menuItemSchema = z.object({
  recipeId: z.string(),
  name: z.string(),
  category: z.string(),
  totalCost: z.number(),
});

const formSchema = z.object({
  name: z.string().min(2, 'Menu name must be at least 2 characters.'),
  items: z.array(menuItemSchema),
});


type MenuFormProps = {
  mode: 'add' | 'edit';
  menu?: Menu;
};

export function MenuForm({
  mode,
  menu,
}: MenuFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: mode === 'edit' && menu ? 
      {
        name: menu.name,
        items: menu.items,
      } : 
      {
        name: '',
        items: [],
      },
  });

  useEffect(() => {
    const qRecipes = query(collection(db, 'recipes'));
    const unsubscribeRecipes = onSnapshot(qRecipes, (querySnapshot) => {
      const recipeData: Recipe[] = [];
      querySnapshot.forEach((doc) => {
        // We only want main recipes on a menu, not sub-recipes
        const data = doc.data();
        if (!data.isSubRecipe) {
          recipeData.push({ id: doc.id, ...data } as Recipe);
        }
      });
      setRecipes(recipeData.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      console.error("Failed to fetch recipes:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load recipes. Please try again later.',
      });
    });

    return () => unsubscribeRecipes();
  }, [toast]);
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
        if (mode === 'edit' && menu) {
            await editMenu(menu.id, values);
             toast({
                title: 'Menu Updated',
                description: `"${values.name}" has been updated.`,
            });
        } else {
            await addMenu(values);
            toast({
                title: 'Menu Added',
                description: `"${values.name}" has been added to your collection.`,
            });
        }
      router.push('/menus');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${mode === 'add' ? 'add' : 'update'} menu. Please try again.`,
      });
    } finally {
      setLoading(false);
    }
  }

  const recipeOptions = recipes.map(recipe => ({
    value: recipe.id,
    label: recipe.name,
  }));

  const handleRecipeSelection = (selectedRecipeIds: string[]) => {
    const selectedRecipes = recipes.filter(r => selectedRecipeIds.includes(r.id));
    const menuItems = selectedRecipes.map(r => ({
      recipeId: r.id,
      name: r.name,
      category: r.category,
      totalCost: r.totalCost,
    }));
    form.setValue('items', menuItems);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col h-full space-y-6"
      >
        <fieldset disabled={loading} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Menu Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., Dinner Menu" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="items"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipes</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={recipeOptions}
                        onValueChange={handleRecipeSelection}
                        defaultValue={field.value.map(item => item.recipeId)}
                        placeholder="Select recipes for this menu..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
        </fieldset>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Menu'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
