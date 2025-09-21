
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { Recipe, InventoryItem, Menu, RecipeIngredient } from '@/lib/types';
import { addRecipe, editRecipe } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query } from 'firebase/firestore';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, PlusCircle, Trash2 } from 'lucide-react';
import { RecipeFinancialsCard } from './RecipeFinancialsCard';
import { cn } from '@/lib/utils';


const formSchema = z.object({
  recipeCode: z.string().min(1, 'Recipe code is required.'),
  name: z.string().min(2, 'Recipe name must be at least 2 characters.'),
  isSubRecipe: z.boolean(),
  category: z.string().min(1, 'Category is required.'),
  menuId: z.string().optional(),
  yield: z.coerce.number().min(0).optional(),
  yieldUnit: z.string().optional(),
  notes: z.string().optional(),
  ingredients: z.array(z.object({
    inventoryItemId: z.string(),
    name: z.string(),
    materialCode: z.string(),
    quantity: z.coerce.number().min(0, 'Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    totalCost: z.number(),
  })).min(1, 'A recipe must have at least one ingredient.'),
  contingencyPercentage: z.coerce.number().min(0).default(5),
  foodCostPercentage: z.coerce.number().min(0).max(100).default(30),
});

type RecipeFormProps = {
  mode: 'add' | 'edit';
  recipe?: Recipe;
};

// This will hold the original unit and unitCost from the inventory for conversion purposes
type InventoryItemDetails = {
    [inventoryItemId: string]: {
        baseUnit: string;
        unitCost: number;
    }
}

const recipeCategories = ['Appetizer', 'Main Course', 'Dessert', 'Beverage', 'Side', 'Sub-recipe'];

export function RecipeForm({ mode, recipe }: RecipeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isIngredientDialogOpen, setIngredientDialogOpen] = useState(false);
  const [inventoryItemDetails, setInventoryItemDetails] = useState<InventoryItemDetails>({});

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
    return watchIngredients.reduce((sum, item) => sum + (item.totalCost || 0), 0);
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

      // Populate details for existing ingredients
      const details: InventoryItemDetails = {};
      const invItemsToGetDetailsFor = recipe.ingredients.map(ing => ing.inventoryItemId);
      const relevantInvItems = inventory.filter(i => invItemsToGetDetailsFor.includes(i.id));

      relevantInvItems.forEach(invItem => {
         details[invItem.id] = {
            baseUnit: invItem.unit,
            unitCost: invItem.unitCost
        }
      })
      setInventoryItemDetails(details);
    }
  }, [recipe, mode, form, inventory]);


  useEffect(() => {
    const qInv = query(collection(db, 'inventory'));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      const fetchedItems: InventoryItem[] = [];
      snapshot.forEach(doc => fetchedItems.push({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventory(fetchedItems.sort((a,b) => a.name.localeCompare(b.name)));
    });

    const qMenus = query(collection(db, 'menus'));
    const unsubMenus = onSnapshot(qMenus, (snapshot) => {
        const fetchedMenus: Menu[] = [];
        snapshot.forEach(doc => fetchedMenus.push({ id: doc.id, ...doc.data() } as Menu));
        setMenus(fetchedMenus.sort((a,b) => a.name.localeCompare(b.name)));
    });

    return () => {
      unsubInv();
      unsubMenus();
    };
  }, []);

  const handleIngredientAdd = (invItem: InventoryItem) => {
    if (fields.some(item => item.inventoryItemId === invItem.id)) {
      toast({
        variant: 'destructive',
        title: 'Ingredient already added',
        description: `"${invItem.name}" is already in this recipe.`
      });
      return;
    }

    append({
      inventoryItemId: invItem.id,
      name: invItem.name,
      materialCode: invItem.materialCode,
      quantity: 1,
      unit: invItem.unit,
      totalCost: invItem.unitCost, // Initial cost
    });
    
    // Store original details for conversion
    setInventoryItemDetails(prev => ({
        ...prev,
        [invItem.id]: {
            baseUnit: invItem.unit,
            unitCost: invItem.unitCost,
        }
    }))

    setIngredientDialogOpen(false);
  };
  
  const handleIngredientChange = (index: number, quantity: number, unit: string) => {
    const ingredient = fields[index];
    const details = inventoryItemDetails[ingredient.inventoryItemId];
    if (!details) return;

    let newTotalCost = 0;
    try {
        const costPerBaseUnit = details.unitCost;
        const convertedQuantity = convert(quantity, unit as Unit, details.baseUnit as Unit);
        newTotalCost = convertedQuantity * costPerBaseUnit;

    } catch (error) {
        console.error("Conversion error:", error);
        toast({
            variant: "destructive",
            title: "Unit Conversion Error",
            description: `Cannot convert from '${unit}' to '${details.baseUnit}'. Please check units.`,
        });
    }
    
    update(index, { ...ingredient, quantity, unit, totalCost: newTotalCost });
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    
    const recipeData = { 
        ...values, 
        totalCost: totalRecipeCost,
        menuId: values.menuId === 'none' ? '' : values.menuId
    };

    try {
      if (mode === 'edit' && recipe) {
        await editRecipe(recipe.id, recipeData);
        toast({ title: 'Recipe Updated', description: `"${values.name}" has been updated.` });
      } else {
        await addRecipe(recipeData);
        toast({ title: 'Recipe Added', description: `"${values.name}" has been created.` });
      }
      router.push('/recipes');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${mode === 'add' ? 'add' : 'update'} recipe.`,
      });
    } finally {
      setLoading(false);
    }
  }

  const isSubRecipe = form.watch('isSubRecipe');

  useEffect(() => {
    if (isSubRecipe) {
      form.setValue('menuId', 'none');
    }
  }, [isSubRecipe, form]);

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
                            <FormControl><Input placeholder="e.g., APP001" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                            <FormLabel>Recipe Name</FormLabel>
                            <FormControl><Input placeholder="e.g., Classic Tomato Soup" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {recipeCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField
                      control={form.control}
                      name="menuId"
                      render={({ field }) => (
                        <FormItem>
                            <FormLabel>Assign to Menu (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubRecipe}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a menu..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {menus.map(menu => <SelectItem key={menu.id} value={menu.id}>{menu.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="yield"
                          render={({ field }) => (
                            <FormItem>
                                <FormLabel>Yield</FormLabel>
                                <FormControl><Input type="number" placeholder="e.g., 4" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField
                          control={form.control}
                          name="yieldUnit"
                          render={({ field }) => (
                            <FormItem>
                                <FormLabel>Yield Unit</FormLabel>
                                <FormControl><Input placeholder="e.g., portions" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                     <FormField
                      control={form.control}
                      name="isSubRecipe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-1 md:col-span-2">
                            <div className="space-y-0.5">
                                <FormLabel>Is Sub-Recipe?</FormLabel>
                                <FormDescription>Sub-recipes are ingredients for other recipes and cannot be sold directly.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )} />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                            <FormLabel>Notes / Method</FormLabel>
                            <FormControl><Textarea placeholder="Describe the preparation method..." {...field} rows={6} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </CardContent>
            </Card>

            {/* Ingredients Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Ingredients</CardTitle>
                    <CardDescription>Add ingredients from your inventory to build the recipe.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Ingredient</TableHead>
                                <TableHead className="w-[120px]">Quantity</TableHead>
                                <TableHead className="w-[150px]">Unit</TableHead>
                                <TableHead className="text-right">Total Cost</TableHead>
                                <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id}>
                                    <TableCell className="text-muted-foreground">{field.materialCode}</TableCell>
                                    <TableCell>{field.name}</TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number"
                                            value={field.quantity}
                                            onChange={(e) => handleIngredientChange(index, parseFloat(e.target.value) || 0, field.unit)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={field.unit}
                                            onValueChange={(value) => handleIngredientChange(index, field.quantity, value)}
                                        >
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                {Object.keys(allUnits).map(unitKey => (
                                                    <SelectItem key={unitKey} value={unitKey}>{(allUnits as any)[unitKey].name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(field.totalCost)}</TableCell>
                                    <TableCell>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {fields.length === 0 && (
                        <div className="py-12 text-center text-muted-foreground">
                            No ingredients added yet.
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                    <Dialog open={isIngredientDialogOpen} onOpenChange={setIngredientDialogOpen}>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline"><PlusCircle className="mr-2 h-4 w-4"/> Add Ingredient</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader><DialogTitle>Select an Ingredient</DialogTitle></DialogHeader>
                            <Command shouldFilter={false}>
                                <CommandInput placeholder="Search inventory..."/>
                                <CommandList>
                                    <CommandEmpty>No inventory items found.</CommandEmpty>
                                    <CommandGroup>
                                        {inventory.map(item => (
                                            <CommandItem
                                                key={item.id}
                                                value={item.name}
                                                onSelect={() => handleIngredientAdd(item)}
                                                className="flex justify-between items-center"
                                            >
                                                <div>
                                                    <p>{item.name}</p>
                                                    <p className="text-xs text-muted-foreground">{item.materialCode}</p>
                                                </div>
                                                <Check className={cn("h-4 w-4", fields.some(i => i.inventoryItemId === item.id) ? "opacity-100" : "opacity-0")} />
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </DialogContent>
                    </Dialog>
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
          <Button type="button" variant="outline" onClick={() => router.push('/recipes')}>
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
