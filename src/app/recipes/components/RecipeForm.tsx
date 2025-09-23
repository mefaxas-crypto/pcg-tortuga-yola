
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import type { Recipe, InventoryItem, Menu } from '@/lib/types';
import { addRecipe, editRecipe } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { allUnits, convert, Unit } from '@/lib/conversions';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Check, PlusCircle, Trash2 } from 'lucide-react';
import { RecipeFinancialsCard } from './RecipeFinancialsCard';
import { cn } from '@/lib/utils';
import { InventoryItemFormSheet } from '@/app/inventory/components/InventoryItemFormSheet';

export const formSchema = z.object({
  internalCode: z.string(),
  sapCode: z.string().optional(),
  name: z.string().min(2, 'Recipe name must be at least 2 characters.'),
  isSubRecipe: z.boolean(),
  category: z.string(),
  menuId: z.string().optional(),
  yield: z.coerce.number().min(0).optional(),
  yieldUnit: z.string().optional(),
  notes: z.string().optional(),
  ingredients: z
    .array(
      z.object({
        itemId: z.string(),
        ingredientType: z.enum(['inventory', 'recipe']),
        itemCode: z.string(),
        name: z.string(),
        quantity: z.coerce.number().min(0, 'Quantity must be positive'),
        unit: z.string().min(1, 'Unit is required'),
        totalCost: z.number(),
      }),
    )
    .min(1, 'A recipe must have at least one ingredient.'),
  contingencyPercentage: z.coerce.number().min(0).default(5),
  foodCostPercentage: z.coerce.number().min(0).max(100).default(30),
}).superRefine((data, ctx) => {
  if (!data.isSubRecipe && !data.category) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['category'],
      message: 'Category is required.',
    });
  }
});

type RecipeFormProps = {
  mode: 'add' | 'edit';
  recipe?: Recipe;
};

type SelectableItem = {
  id: string;
  name: string;
  type: 'inventory' | 'recipe';
  code: string;
  baseUnit: string;
  costPerBaseUnit: number;
  defaultRecipeUnit: string;
};


// This will hold the original unit and unitCost from the inventory/sub-recipe for conversion purposes
type ItemDetails = {
  [itemId: string]: {
    baseUnit: string;
    costPerBaseUnit: number;
  };
};

const recipeCategories = [
  'Appetizer',
  'Main Course',
  'Dessert',
  'Beverage',
  'Side',
];

const availableUnits = Object.keys(allUnits).map(key => ({
    value: key,
    label: allUnits[key as keyof typeof allUnits].name
}));


export function RecipeForm({ mode, recipe }: RecipeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [subRecipeItems, setSubRecipeItems] = useState<Recipe[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isIngredientPopoverOpen, setIngredientPopoverOpen] = useState(false);
  const [isNewIngredientSheetOpen, setNewIngredientSheetOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const [itemDetails, setItemDetails] = useState<ItemDetails>({});

  // Refs for keyboard navigation flow
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quantityInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const unitSelectsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const lastAddedIngredientIndex = useRef<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      internalCode: `SUB${Date.now()}`, // Auto-generate for new recipes
      sapCode: '',
      name: '',
      isSubRecipe: false,
      category: '',
      menuId: 'none',
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
  
  // Effect to focus on the new quantity input
  useEffect(() => {
    if (lastAddedIngredientIndex.current !== null) {
      const index = lastAddedIngredientIndex.current;
      quantityInputsRef.current[index]?.focus();
      lastAddedIngredientIndex.current = null;
    }
  }, [fields.length]);

  const watchIngredients = form.watch('ingredients');
  const totalRecipeCost = useMemo(() => {
    return watchIngredients.reduce(
      (sum, item) => sum + (item.totalCost || 0),
      0,
    );
  }, [watchIngredients]);

  // Combined and memoized list of selectable items
  const selectableItems = useMemo<SelectableItem[]>(() => {
    const invSelectable: SelectableItem[] = inventoryItems.map(data => ({
      id: data.id,
      name: data.name,
      type: 'inventory',
      code: data.materialCode,
      baseUnit: data.recipeUnit,
      costPerBaseUnit: data.unitCost,
      defaultRecipeUnit: data.recipeUnit || data.unit,
    }));

    const subSelectable: Recipe[] = subRecipeItems.map(data => ({
      id: data.id,
      ...data
    } as Recipe));

    const subSelectableItems: SelectableItem[] = subSelectable.map(data => ({
        id: data.id,
        name: data.name,
        type: 'recipe',
        code: data.internalCode,
        baseUnit: data.yieldUnit || 'un.',
        costPerBaseUnit: data.totalCost / (data.yield || 1),
        defaultRecipeUnit: data.yieldUnit || 'un.',
    }));

    return [...invSelectable, ...subSelectableItems].sort((a,b) => a.name.localeCompare(b.name));
  }, [inventoryItems, subRecipeItems]);

  const { subRecipeSelectable, inventoryOnlySelectable } = useMemo(() => {
    const subRecipes = selectableItems.filter(item => item.type === 'recipe');
    // Get a set of material codes that belong to sub-recipes
    const subRecipeCodes = new Set(subRecipes.map(item => item.code));
    // Filter inventory items to exclude any that are also sub-recipes
    const inventory = selectableItems.filter(item => item.type === 'inventory' && !subRecipeCodes.has(item.code));
    return { subRecipeSelectable: subRecipes, inventoryOnlySelectable: inventory };
  }, [selectableItems]);


  useEffect(() => {
    if (mode === 'edit' && recipe) {
      form.reset({
        internalCode: recipe.internalCode,
        sapCode: recipe.sapCode || '',
        name: recipe.name,
        isSubRecipe: recipe.isSubRecipe,
        category: recipe.category,
        menuId: recipe.menuId || 'none',
        yield: recipe.yield,
        yieldUnit: recipe.yieldUnit,
        notes: recipe.notes,
        ingredients: recipe.ingredients,
        contingencyPercentage: recipe.contingencyPercentage,
        foodCostPercentage: recipe.foodCostPercentage,
      });

      const details: ItemDetails = {};
       const itemsToGetDetailsFor = recipe.ingredients.map(
        (ing) => ing.itemId,
      );
      const relevantItems = selectableItems.filter((i) =>
        itemsToGetDetailsFor.includes(i.id),
      );

      relevantItems.forEach((item) => {
        details[item.id] = {
          baseUnit: item.baseUnit,
          costPerBaseUnit: item.costPerBaseUnit,
        };
      });
      setItemDetails(details);
    }
  }, [recipe, mode, form, selectableItems]);

  useEffect(() => {
    // Fetch Inventory Items
    const qInv = query(collection(db, 'inventory'));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      const items: InventoryItem[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventoryItems(items);
    });
  
    // Fetch Sub-Recipes
    const qSubRecipes = query(collection(db, 'recipes'), where('isSubRecipe', '==', true));
    const unsubSubRecipes = onSnapshot(qSubRecipes, (snapshot) => {
      const subs: Recipe[] = [];
      snapshot.forEach((doc) => {
        // Exclude the current recipe being edited from the list of sub-recipes
        if (mode === 'edit' && recipe?.id === doc.id) return;
        subs.push({ id: doc.id, ...doc.data() } as Recipe);
      });
      setSubRecipeItems(subs);
    });
  
    // Fetch Menus
    const qMenus = query(collection(db, 'menus'));
    const unsubMenus = onSnapshot(qMenus, (snapshot) => {
      const fetchedMenus: Menu[] = [];
      snapshot.forEach((doc) => fetchedMenus.push({ id: doc.id, ...doc.data() } as Menu));
      setMenus(fetchedMenus.sort((a, b) => a.name.localeCompare(b.name)));
    });
  
    return () => {
      unsubInv();
      unsubSubRecipes();
      unsubMenus();
    };
  }, [mode, recipe?.id]);


  const handleIngredientAdd = (item: SelectableItem) => {
    if (fields.some((field) => field.itemId === item.id)) {
      toast({
        variant: 'destructive',
        title: 'Ingredient already added',
        description: `"${item.name}" is already in this recipe.`,
      });
      return;
    }

    const newIndex = fields.length;
    append({
      itemId: item.id,
      ingredientType: item.type,
      itemCode: item.code,
      name: item.name,
      quantity: 0,
      unit: item.defaultRecipeUnit, // Use the new default recipe unit
      totalCost: 0,
    });
    lastAddedIngredientIndex.current = newIndex;


    // Store original details for conversion
    setItemDetails((prev) => ({
      ...prev,
      [item.id]: {
        baseUnit: item.baseUnit,
        costPerBaseUnit: item.costPerBaseUnit,
      },
    }));

    setIngredientPopoverOpen(false);
    setSearchValue('');
  };

  const handleIngredientChange = (
    index: number,
    quantity: number,
    unit: string,
  ) => {
    const ingredient = form.getValues(`ingredients.${index}`);
    const details = itemDetails[ingredient.itemId];
    if (!details) return;

    let newTotalCost = 0;
    try {
      const convertedQuantity = convert(
        quantity,
        unit as Unit,
        details.baseUnit as Unit,
      );
      newTotalCost = convertedQuantity * details.costPerBaseUnit;
    } catch (error) {
      console.error('Conversion error:', error);
      toast({
        variant: 'destructive',
        title: 'Unit Conversion Error',
        description: `Cannot convert from '${unit}' to '${details.baseUnit}'. Please check units.`,
      });
    }

    update(index, { ...ingredient, quantity, unit, totalCost: newTotalCost });
  };
  
  const getUnitCost = (itemId: string, displayUnit: string): number => {
    const details = itemDetails[itemId];
    if (!details) return 0;
    try {
      // Calculate how many base units are in one display unit.
      const oneDisplayUnitInBaseUnit = convert(1, displayUnit as Unit, details.baseUnit as Unit);
      // The cost of the display unit is that amount times the cost of a single base unit.
      return oneDisplayUnitInBaseUnit * details.costPerBaseUnit;
    } catch (error) {
      // This might happen if units are incompatible.
      console.error("Could not calculate unit cost:", error);
      return 0;
    }
  }

  const formatCurrency = (value: number) => {
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'USD',
    };
    if (value > 0 && value < 0.01) {
        options.minimumFractionDigits = 4;
    } else {
        options.minimumFractionDigits = 2;
        options.maximumFractionDigits = 2;
    }
    return new Intl.NumberFormat('en-US', options).format(value || 0);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const recipeData = {
      ...values,
      category: values.isSubRecipe ? 'Sub-recipe' : values.category,
      totalCost: totalRecipeCost,
      menuId: values.isSubRecipe || values.menuId === 'none' ? '' : values.menuId,
    };

    try {
      if (mode === 'edit' && recipe) {
        await editRecipe(recipe.id, recipeData);
        toast({
          title: 'Recipe Updated',
          description: `"${values.name}" has been updated.`,
        });
      } else {
        await addRecipe(recipeData);
        toast({
          title: 'Recipe Added',
          description: `"${values.name}" has been created.`,
        });
      }
      router.push('/recipes');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${
          mode === 'add' ? 'add' : 'update'
        } recipe.`,
      });
    } finally {
      setLoading(false);
    }
  }
  
  const isSubRecipe = form.watch('isSubRecipe');

  useEffect(() => {
    if (isSubRecipe) {
      form.setValue('menuId', 'none');
      form.setValue('category', 'Sub-recipe');
    } else {
       if (form.getValues('category') === 'Sub-recipe') {
        form.setValue('category', '');
       }
    }
  }, [isSubRecipe, form]);

  const handleNewIngredientCreated = (newItem: InventoryItem) => {
    const selectableItem: SelectableItem = {
      id: newItem.id,
      name: newItem.name,
      type: 'inventory',
      code: newItem.materialCode,
      baseUnit: newItem.unit,
      costPerBaseUnit: newItem.unitCost,
      defaultRecipeUnit: newItem.recipeUnit || newItem.unit,
    };
    handleIngredientAdd(selectableItem);
    setNewIngredientSheetOpen(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <fieldset disabled={loading} className="space-y-8">
          {/* Recipe Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Recipe Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Classic Tomato Soup"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sapCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SAP Code (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 100284" {...field} />
                    </FormControl>
                    <FormDescription>The official SAP code for this recipe. Can be added later.</FormDescription>
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
                          <SelectValue placeholder="Select a category..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {recipeCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
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
                name="menuId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Menu (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubRecipe}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a menu..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {menus.map((menu) => (
                          <SelectItem key={menu.id} value={menu.id}>
                            {menu.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
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
                      <FormLabel>Yield Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="e.g., portion" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                             {Object.keys(allUnits).map(key => (
                                <SelectItem key={key} value={key}>{allUnits[key as keyof typeof allUnits].name}</SelectItem>
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
                name="isSubRecipe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-1 md:col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel>Is Sub-Recipe?</FormLabel>
                      <FormDescription>
                        Sub-recipes are ingredients for other recipes and cannot
                        be sold directly.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Notes / Method</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the preparation method..."
                        {...field}
                        rows={6}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Ingredients Card */}
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <CardTitle>Ingredients</CardTitle>
                <CardDescription>
                  Add ingredients from your inventory or other sub-recipes.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setNewIngredientSheetOpen(true)} className='mt-4 md:mt-0'>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Ingredient
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='hidden sm:table-cell'>Code</TableHead>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="w-[120px]">Quantity</TableHead>
                    <TableHead className="w-[150px]">Unit</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="w-[50px]">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const unitCost = getUnitCost(field.itemId, field.unit);
                    return (
                    <TableRow key={field.id}>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {field.itemCode}
                      </TableCell>
                      <TableCell>
                        <div>{field.name}</div>
                        <div className='text-xs text-muted-foreground sm:hidden'>{field.itemCode}</div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="any"
                          defaultValue={field.quantity}
                          ref={(el) => { quantityInputsRef.current[index] = el; }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              unitSelectsRef.current[index]?.focus();
                            }
                          }}
                          onBlur={(e) =>
                            handleIngredientChange(
                              index,
                              parseFloat(e.target.value) || 0,
                              form.getValues(`ingredients.${index}.unit`),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          defaultValue={field.unit}
                          onValueChange={(value) =>
                            handleIngredientChange(index, form.getValues(`ingredients.${index}.quantity`), value)
                          }
                        >
                          <SelectTrigger
                            ref={(el) => { unitSelectsRef.current[index] = el; }}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                 e.preventDefault();
                                 searchInputRef.current?.focus();
                               }
                             }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUnits.map(unit => (
                                <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground hidden md:table-cell">
                        {formatCurrency(unitCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(field.totalCost)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
                <TableFooter>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7}>
                       <Popover open={isIngredientPopoverOpen} onOpenChange={setIngredientPopoverOpen}>
                        <Command>
                          <PopoverAnchor>
                            <CommandInput
                              ref={searchInputRef}
                              value={searchValue}
                              onValueChange={(search) => {
                                setSearchValue(search);
                                if (search) {
                                  setIngredientPopoverOpen(true);
                                } else {
                                  setIngredientPopoverOpen(false);
                                }
                              }}
                              placeholder="Search to add ingredient..."
                            />
                          </PopoverAnchor>
                          <PopoverContent className="w-[--radix-popover-anchor-width)] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                              <CommandList>
                                <CommandEmpty>No results found.</CommandEmpty>
                                <CommandGroup heading="Sub-Recipes">
                                  {subRecipeSelectable.map((item) => (
                                    <CommandItem
                                      key={item.id}
                                      value={item.name}
                                      onSelect={() => handleIngredientAdd(item)}
                                    >
                                      <Check className={cn('mr-2 h-4 w-4', fields.some(i => i.itemId === item.id) ? 'opacity-100' : 'opacity-0')} />
                                      {item.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                                <CommandSeparator />
                                <CommandGroup heading="Inventory Items">
                                  {inventoryOnlySelectable.map((item) => (
                                    <CommandItem
                                      key={item.id}
                                      value={item.name}
                                      onSelect={() => handleIngredientAdd(item)}
                                    >
                                      <Check className={cn('mr-2h-4 w-4', fields.some(i => i.itemId === item.id) ? 'opacity-100' : 'opacity-0')} />
                                      {item.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                          </PopoverContent>
                        </Command>
                      </Popover>
                      <FormMessage>{form.formState.errors.ingredients?.root?.message || form.formState.errors.ingredients?.message}</FormMessage>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* Financials Card */}
          <RecipeFinancialsCard
            form={form}
            totalRecipeCost={totalRecipeCost}
            isSubRecipe={isSubRecipe}
          />
        </fieldset>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/recipes')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Recipe'}
          </Button>
        </div>
      </form>
      <InventoryItemFormSheet
        open={isNewIngredientSheetOpen}
        onClose={() => setNewIngredientSheetOpen(false)}
        mode="add"
        onItemCreated={handleNewIngredientCreated}
       />
    </Form>
  );
}
