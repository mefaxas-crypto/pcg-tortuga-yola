'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { addRecipe, editRecipe } from '@/lib/actions';
import { useEffect, useState } from 'react';
import type { InventoryItem, Recipe, RecipeIngredient } from '@/lib/types';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Info, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';

const recipeIngredientSchema = z.object({
  inventoryItemId: z.string().min(1, 'Please select an ingredient.'),
  name: z.string(), // We'll populate this from the selected item
  unit: z.string(),   // We'll populate this from the selected item
  quantity: z.coerce.number().min(0.001, 'Quantity must be positive.'),
});

const formSchema = z.object({
  recipeCode: z.string().min(1, 'Recipe code is required.'),
  name: z.string().min(2, 'Recipe name must be at least 2 characters.'),
  isSubRecipe: z.boolean(),
  category: z.string().optional(),
  yield: z.coerce.number().min(0, 'Yield must be a positive number.').optional(),
  yieldUnit: z.string().optional(),
  notes: z.string().optional(),
  ingredients: z.array(recipeIngredientSchema).min(1, 'A recipe must have at least one ingredient.'),
}).superRefine((data, ctx) => {
    if (!data.isSubRecipe && !data.category) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['category'],
            message: 'Category is required for a main recipe.',
        });
    }
});


type RecipeFormProps = {
  mode: 'add' | 'edit';
  recipe?: Recipe;
};

// Placeholder data
const recipeCategories = ['Appetizer', 'Entree', 'Dessert', 'Beverage', 'Other'];
const recipeUnits = ['kg', 'g', 'lb', 'oz', 'L', 'mL', 'fl. oz', 'unit', 'portion'];


export function RecipeForm({
  mode,
  recipe,
}: RecipeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: mode === 'edit' && recipe ? 
      {
        ...recipe,
        yield: recipe.yield || 1,
        yieldUnit: recipe.yieldUnit || 'portion',
        isSubRecipe: recipe.isSubRecipe || false,
      } : 
      {
        recipeCode: '',
        name: '',
        isSubRecipe: false,
        category: '',
        yield: 1,
        yieldUnit: 'portion',
        notes: '',
        ingredients: [{ inventoryItemId: '', quantity: 0, name: '', unit: '' }],
      },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'ingredients',
  });

  const isSubRecipe = form.watch('isSubRecipe');

  useEffect(() => {
    const q = query(collection(db, 'inventory'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const inventoryData: InventoryItem[] = [];
      querySnapshot.forEach((doc) => {
        inventoryData.push({ id: doc.id, ...doc.data() } as InventoryItem);
      });
      setInventory(inventoryData.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      console.error("Failed to fetch inventory:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load inventory items. Please try again later.',
      });
    });

    return () => unsubscribe();
  }, [toast]);
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
        const dataToSave = {
            ...values,
            category: values.isSubRecipe ? 'Sub-recipe' : values.category,
        };

        if (mode === 'edit' && recipe) {
            await editRecipe(recipe.id, dataToSave);
             toast({
                title: 'Recipe Updated',
                description: `"${values.name}" has been updated.`,
            });
        } else {
            await addRecipe(dataToSave);
            toast({
                title: 'Recipe Added',
                description: `"${values.name}" has been added to your collection.`,
            });
        }
      router.push('/recipes');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${mode === 'add' ? 'add' : 'update'} recipe. Please try again.`,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col h-full space-y-6"
      >
        <fieldset disabled={loading} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-5 gap-4">
                <FormField
                control={form.control}
                name="recipeCode"
                render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                    <FormLabel>Recipe Code</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., REC001" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                    <FormLabel>Recipe Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Classic Bolognese" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="isSubRecipe"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-2 shadow-sm">
                  <FormLabel className="text-xs">Recipe Type</FormLabel>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className={cn("text-xs", !field.value ? 'text-muted-foreground' : 'text-foreground')}>Sub-recipe</span>
                     <FormControl>
                        <Switch
                          checked={!field.value}
                          onCheckedChange={(checked) => field.onChange(!checked)}
                          aria-readonly
                          className="data-[state=checked]:h-5 data-[state=unchecked]:h-5 data-[state=checked]:w-9 data-[state=unchecked]:w-9 [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:translate-x-4"
                        />
                      </FormControl>
                    <span className={cn("text-xs", field.value ? 'text-muted-foreground' : 'text-foreground')}>Recipe</span>
                  </div>
                </FormItem>
              )}
            />
          </div>
           <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
             <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="yield"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yield</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 4" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="yieldUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {recipeUnits.map(unit => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
          </div>
          <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity", isSubRecipe ? "opacity-50 pointer-events-none" : "opacity-100")}>
            {/* This is a placeholder. It will be functional in a future step. */}
            <FormItem>
              <FormLabel>Menu</FormLabel>
              <Select disabled>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a menu" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="placeholder">Dinner Menu (placeholder)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubRecipe}>
                      <FormControl>
                      <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                      {recipeCategories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                      </SelectContent>
                  </Select>
                  <FormMessage />
                  </FormItem>
              )}
            />
          </div>
          
           <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes / Method</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add preparation instructions or notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

           <div>
            <h3 className="text-lg font-medium mb-2">Ingredients</h3>
            <div className="space-y-4">
              {fields.map((field, index) => {
                const selectedItemId = form.watch(`ingredients.${index}.inventoryItemId`);
                const selectedItem = inventory.find(i => i.id === selectedItemId);

                return (
                    <div key={field.id} className="grid grid-cols-[1fr_100px_50px_auto] gap-2 items-start p-3 bg-secondary/30 rounded-lg">
                      <FormField
                        control={form.control}
                        name={`ingredients.${index}.inventoryItemId`}
                        render={({ field }) => (
                          <FormItem>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                const item = inventory.find(i => i.id === value);
                                if (item) {
                                  form.setValue(`ingredients.${index}.name`, item.name);
                                  form.setValue(`ingredients.${index}.unit`, item.unit);
                                }
                              }} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select ingredient" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {inventory.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`ingredients.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" step="any" placeholder="Qty" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="pt-2 text-sm text-muted-foreground">
                        {selectedItem?.unit}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-9 w-9"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                );
              })}
              <FormMessage className={cn(!form.formState.errors.ingredients ? "hidden" : "")}>
                {form.formState.errors.ingredients?.root?.message || form.formState.errors.ingredients?.message}
              </FormMessage>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => append({ inventoryItemId: '', quantity: 0, name: '', unit: '' })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Ingredient
              </Button>
            </div>
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Recipe'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
