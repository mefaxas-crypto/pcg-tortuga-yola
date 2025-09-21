
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
import { useEffect, useMemo, useState } from 'react';
import type { InventoryItem, Menu, Recipe } from '@/lib/types';
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
import { ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryItemFormSheet } from '@/app/inventory/components/InventoryItemFormSheet';
import { RecipeFinancialsCard } from './RecipeFinancialsCard';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const recipeIngredientSchema = z.object({
  inventoryItemId: z.string().min(1, 'Please select an ingredient.'),
  name: z.string(), // Populated from selected item
  materialCode: z.string(), // Populated from selected item
  unit: z.string(),   // Populated from selected item
  unitPrice: z.coerce.number(), // Populated from selected item
  quantity: z.coerce.number().min(0.001, 'Quantity must be positive.'),
  totalCost: z.coerce.number(), // Calculated field
});

const formSchema = z.object({
  recipeCode: z.string().min(1, 'Recipe code is required.'),
  name: z.string().min(2, 'Recipe name must be at least 2 characters.'),
  isSubRecipe: z.boolean(),
  menuId: z.string().optional(),
  category: z.string().optional(),
  yield: z.coerce.number().min(0, 'Yield must be a positive number.').optional(),
  yieldUnit: z.string().optional(),
  notes: z.string().optional(),
  ingredients: z.array(recipeIngredientSchema).min(1, 'A recipe must have at least one ingredient.'),
  contingencyPercentage: z.coerce.number().min(0).max(100).optional(),
  foodCostPercentage: z.coerce.number().min(0).max(100).optional(),
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

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
}


export function RecipeForm({
  mode,
  recipe,
}: RecipeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [ingredientSheetOpen, setIngredientSheetOpen] = useState(false);
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);

  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: mode === 'edit' && recipe ? 
      {
        ...recipe,
        yield: recipe.yield || 1,
        yieldUnit: recipe.yieldUnit || 'portion',
        isSubRecipe: recipe.isSubRecipe || false,
        contingencyPercentage: recipe.contingencyPercentage || 5,
        foodCostPercentage: recipe.foodCostPercentage || 30,
      } : 
      {
        recipeCode: '',
        name: '',
        isSubRecipe: false,
        menuId: '',
        category: '',
        yield: 1,
        yieldUnit: 'portion',
        notes: '',
        ingredients: [],
        contingencyPercentage: 5,
        foodCostPercentage: 30,
      },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'ingredients',
  });

  useEffect(() => {
    if (recipe && recipe.ingredients) {
      setSearchQueries(recipe.ingredients.map(ing => ing.name));
    }
  }, [recipe]);

  const isSubRecipe = form.watch('isSubRecipe');
  const ingredients = form.watch('ingredients');

  const totalRecipeCost = useMemo(() => {
    return ingredients.reduce((total, item) => total + (item.totalCost || 0), 0);
  }, [ingredients]);

  const addEmptyIngredient = () => {
    append({
        inventoryItemId: '',
        quantity: 1,
        name: '',
        materialCode: '',
        unit: '',
        unitPrice: 0,
        totalCost: 0
    });
    setSearchQueries([...searchQueries, '']);
  };
  
  useEffect(() => {
    const qInventory = query(collection(db, 'inventory'));
    const unsubscribeInventory = onSnapshot(qInventory, (querySnapshot) => {
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

    const qMenus = query(collection(db, 'menus'));
    const unsubscribeMenus = onSnapshot(qMenus, (querySnapshot) => {
      const menuData: Menu[] = [];
      querySnapshot.forEach((doc) => {
        menuData.push({ id: doc.id, ...doc.data() } as Menu);
      });
      setMenus(menuData.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      console.error("Failed to fetch menus:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load menus. Please try again later.',
      });
    });

    if (mode === 'add' && fields.length === 0) {
      addEmptyIngredient();
    }

    return () => {
      unsubscribeInventory();
      unsubscribeMenus();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, mode]);
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
        const dataToSave = {
            ...values,
            category: values.isSubRecipe ? 'Sub-recipe' : values.category!,
            totalCost: totalRecipeCost,
            ingredients: values.ingredients.filter(ing => ing.inventoryItemId) // Filter out empty rows
        };

        if (dataToSave.ingredients.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Ingredients',
                description: 'A recipe must have at least one ingredient.',
            });
            setLoading(false);
            return;
        }

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
    <>
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
                <FormItem className="rounded-lg border p-1 px-2 shadow-sm">
                  <FormLabel className="text-xs">Recipe Type</FormLabel>
                  <div className="flex items-center justify-between gap-1 pt-0.5">
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
                        <Input type="number" placeholder="e.g., 4" {...field} value={field.value || ''} />
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
            <FormField
              control={form.control}
              name="menuId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Menu</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubRecipe}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a menu" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {menus.map(menu => (
                          <SelectItem key={menu.id} value={menu.id}>{menu.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          
           <Card>
                <CardHeader>
                    <CardTitle>Ingredients</CardTitle>
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className='w-[100px]'>Code</TableHead>
                            <TableHead>Ingredient</TableHead>
                            <TableHead className='w-[120px]'>Quantity</TableHead>
                            <TableHead className='w-[80px]'>Unit</TableHead>
                            <TableHead className='w-[120px] text-right'>Unit Price</TableHead>
                            <TableHead className='w-[120px] text-right'>Total Cost</TableHead>
                            <TableHead className='w-[50px]'></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {fields.map((field, index) => {
                            const selectedItem = inventory.find(i => i.id === form.watch(`ingredients.${index}.inventoryItemId`));
                            const unitPrice = form.watch(`ingredients.${index}.unitPrice`) || 0;
                            const totalCost = form.watch(`ingredients.${index}.totalCost`) || 0;
                            const currentSearchQuery = searchQueries[index] || '';

                            return (
                                <TableRow key={field.id} className="align-top">
                                    <TableCell className="pt-2 pb-3 text-muted-foreground">{selectedItem?.materialCode || '-'}</TableCell>
                                    <TableCell className="pt-2 pb-3">
                                        <FormField
                                            control={form.control}
                                            name={`ingredients.${index}.inventoryItemId`}
                                            render={({ field: inventoryItemField }) => (
                                                <FormItem>
                                                    <Popover open={openPopoverIndex === index} onOpenChange={(open) => setOpenPopoverIndex(open ? index : null)}>
                                                      <PopoverTrigger asChild>
                                                        <FormControl>
                                                          <Input
                                                            placeholder="Search ingredients..."
                                                            value={currentSearchQuery}
                                                            onChange={(e) => {
                                                              const newQueries = [...searchQueries];
                                                              newQueries[index] = e.target.value;
                                                              setSearchQueries(newQueries);
                                                              if (openPopoverIndex !== index) {
                                                                  setOpenPopoverIndex(index);
                                                              }
                                                            }}
                                                            onFocus={() => setOpenPopoverIndex(index)}
                                                          />
                                                        </FormControl>
                                                      </PopoverTrigger>
                                                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                        {/* Content will be added in the next step */}
                                                      </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell className="pt-2 pb-3">
                                        <FormField
                                            control={form.control}
                                            name={`ingredients.${index}.quantity`}
                                            render={({ field: quantityField }) => (
                                            <FormItem>
                                                <FormControl>
                                                <Input 
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder="Qty"
                                                    value={quantityField.value || ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        quantityField.onChange(value);
                                                        
                                                        const newQuantity = parseFloat(value);
                                                        const currentUnitPrice = form.getValues(`ingredients.${index}.unitPrice`) || 0;

                                                        if (!isNaN(newQuantity) && newQuantity > 0) {
                                                            const newTotal = newQuantity * currentUnitPrice;
                                                            form.setValue(`ingredients.${index}.totalCost`, newTotal);
                                                        } else {
                                                            form.setValue(`ingredients.${index}.totalCost`, 0);
                                                        }
                                                    }}
                                                />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell className="pt-3.5 pb-3 text-sm text-muted-foreground">{selectedItem?.unit}</TableCell>
                                    <TableCell className="pt-3.5 pb-3 text-right text-sm text-muted-foreground">{formatCurrency(unitPrice)}</TableCell>
                                    <TableCell className="pt-3.5 pb-3 text-right text-sm font-medium">{formatCurrency(totalCost)}</TableCell>
                                    <TableCell className="pt-2 pb-3">
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
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                <CardFooter className="flex-col items-stretch gap-4 !p-6">
                    <FormMessage className={cn(!form.formState.errors.ingredients ? "hidden" : "")}>
                        {form.formState.errors.ingredients?.root?.message || form.formState.errors.ingredients?.message}
                    </FormMessage>

                    <div className="flex items-center gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addEmptyIngredient()}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Ingredient
                        </Button>
                    </div>
                </CardFooter>
            </Card>

            <RecipeFinancialsCard 
                form={form}
                totalRecipeCost={totalRecipeCost}
                isSubRecipe={isSubRecipe}
            />
          
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
    <InventoryItemFormSheet 
        open={ingredientSheetOpen}
        onClose={() => setIngredientSheetOpen(false)}
        mode="add"
    />
    </>
  );
}

