

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
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
  CardFooter,
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
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
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
import { Check, ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react';
import { RecipeFinancialsCard } from './RecipeFinancialsCard';
import { cn } from '@/lib/utils';
import { InventoryItemFormSheet } from '@/app/inventory/components/InventoryItemFormSheet';

const formSchema = z.object({
  recipeCode: z.string().min(1, 'Recipe code is required.'),
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
  // This is the unit we use for costing, the smallest logical unit
  baseUnit: string;
  costPerBaseUnit: number;
  // This is the default unit to show in the recipe form
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
  const [selectableItems, setSelectableItems] = useState<SelectableItem[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isIngredientPopoverOpen, setIngredientPopoverOpen] = useState(false);
  const [isNewIngredientSheetOpen, setNewIngredientSheetOpen] = useState(false);

  const [itemDetails, setItemDetails] = useState<ItemDetails>({});

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipeCode: '',
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

  const watchIngredients = form.watch('ingredients');
  const totalRecipeCost = useMemo(() => {
    return watchIngredients.reduce(
      (sum, item) => sum + (item.totalCost || 0),
      0,
    );
  }, [watchIngredients]);

  useEffect(() => {
    if (mode === 'edit' && recipe) {
      form.reset({
        recipeCode: recipe.recipeCode,
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
    const qInv = query(collection(db, 'inventory'));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      const invItems: SelectableItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as InventoryItem
        invItems.push({ 
          id: doc.id,
          name: data.name,
          type: 'inventory',
          code: data.materialCode,
          baseUnit: data.unit, // This is the smallest unit for tracking (g, ml, un)
          costPerBaseUnit: data.unitCost,
          defaultRecipeUnit: data.recipeUnit || data.unit,
         });
      });
      setSelectableItems(current => [...invItems, ...current.filter(i => i.type === 'recipe')].sort((a,b) => a.name.localeCompare(b.name)));
    });

    const qSubRecipes = query(collection(db, 'recipes'), where('isSubRecipe', '==', true));
    const unsubSubRecipes = onSnapshot(qSubRecipes, (snapshot) => {
        const subRecipes: SelectableItem[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as Recipe;
            if (mode === 'edit' && recipe?.id === doc.id) return;
            
            subRecipes.push({
                id: doc.id,
                name: data.name,
                type: 'recipe',
                code: data.recipeCode,
                baseUnit: data.yieldUnit || 'un.',
                costPerBaseUnit: data.totalCost / (data.yield || 1),
                defaultRecipeUnit: data.yieldUnit || 'un.',
            });
        });
        setSelectableItems(current => [...subRecipes, ...current.filter(i => i.type === 'inventory')].sort((a,b) => a.name.localeCompare(b.name)));
    });

    const qMenus = query(collection(db, 'menus'));
    const unsubMenus = onSnapshot(qMenus, (snapshot) => {
      const fetchedMenus: Menu[] = [];
      snapshot.forEach((doc) =>
        fetchedMenus.push({ id: doc.id, ...doc.data() } as Menu),
      );
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

    append({
      itemId: item.id,
      ingredientType: item.type,
      itemCode: item.code,
      name: item.name,
      quantity: 1,
      unit: item.defaultRecipeUnit, // Use the new default recipe unit
      totalCost: item.costPerBaseUnit, // Cost for 1 base unit initially
    });

    // Store original details for conversion
    setItemDetails((prev) => ({
      ...prev,
      [item.id]: {
        baseUnit: item.baseUnit,
        costPerBaseUnit: item.costPerBaseUnit,
      },
    }));

    setIngredientPopoverOpen(false);
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
      // Calculate the cost of 1 displayUnit by converting it to the base unit
      const oneDisplayUnitInBaseUnit = convert(1, displayUnit as Unit, details.baseUnit as Unit);
      return oneDisplayUnitInBaseUnit * details.costPerBaseUnit;
    } catch (error) {
      // This might happen if units are incompatible, though our convert function is now more lenient.
      console.error("Could not calculate unit cost:", error);
      return 0;
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(value || 0);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const recipeData = {
      ...values,
      category: values.isSubRecipe ? 'Sub-recipe' : values.category,
      totalCost: totalRecipeCost,
      menuId: values.menuId === 'none' ? '' : values.menuId,
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
                name="recipeCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., APP001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            <CardHeader>
              <CardTitle>Ingredients</CardTitle>
              <CardDescription>
                Add ingredients from your inventory or other sub-recipes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="w-[120px]">Quantity</TableHead>
                    <TableHead className="w-[150px]">Unit</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
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
                      <TableCell className="text-muted-foreground">
                        {field.itemCode}
                      </TableCell>
                      <TableCell>{field.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="any"
                          defaultValue={field.quantity}
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
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUnits.map(unit => (
                                <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
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
                   {fields.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                                No ingredients added yet.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4 border-t pt-6">
                <h4 className="font-medium">Add Ingredient</h4>
                <Popover open={isIngredientPopoverOpen} onOpenChange={setIngredientPopoverOpen}>
                    <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        className="w-full md:w-[300px] justify-between"
                    >
                        Search inventory & sub-recipes...
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command shouldFilter={false}>
                        <CommandInput placeholder="Search for an ingredient..." />
                        <CommandList>
                        <CommandEmpty>No ingredients found.</CommandEmpty>
                        <CommandGroup heading="Sub-Recipes">
                            {selectableItems.filter(item => item.type === 'recipe').map((item) => (
                            <CommandItem
                                key={item.id}
                                value={item.name}
                                onSelect={() => handleIngredientAdd(item)}
                            >
                                <Check
                                className={cn(
                                    'mr-2 h-4 w-4',
                                    fields.some(i => i.itemId === item.id) ? 'opacity-100' : 'opacity-0',
                                )}
                                />
                                {item.name}
                            </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Inventory Items">
                            {selectableItems.filter(item => item.type === 'inventory').map((item) => (
                            <CommandItem
                                key={item.id}
                                value={item.name}
                                onSelect={() => handleIngredientAdd(item)}
                            >
                                <Check
                                className={cn(
                                    'mr-2 h-4 w-4',
                                    fields.some(i => i.itemId === item.id) ? 'opacity-100' : 'opacity-0',
                                )}
                                />
                                {item.name}
                            </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                            <CommandItem
                                onSelect={() => {
                                    setIngredientPopoverOpen(false);
                                    setNewIngredientSheetOpen(true);
                                }}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create New Ingredient
                            </CommandItem>
                        </CommandGroup>
                        </CommandList>
                    </Command>
                    </PopoverContent>
                </Popover>

              <FormMessage>{form.formState.errors.ingredients?.message}</FormMessage>
            </CardFooter>
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
