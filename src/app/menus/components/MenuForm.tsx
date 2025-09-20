
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
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { addMenu, editMenu } from '@/lib/actions';
import { useEffect, useState, useMemo } from 'react';
import type { Menu, Recipe } from '@/lib/types';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
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
} from '@/components/ui/command';
import { Check, ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const menuItemSchema = z.object({
  recipeId: z.string().min(1),
  name: z.string(),
  category: z.string(),
  totalCost: z.number(),
  sellingPrice: z.coerce.number().min(0, 'Price must be positive.'),
});

const formSchema = z.object({
  name: z.string().min(2, 'Menu name must be at least 2 characters.'),
  items: z.array(menuItemSchema).min(1, 'A menu must have at least one recipe.'),
});

type MenuFormProps = {
  mode: 'add' | 'edit';
  menu?: Menu;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
}

export function MenuForm({ mode, menu }: MenuFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [openRecipePopover, setOpenRecipePopover] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues:
      mode === 'edit' && menu
        ? {
            name: menu.name,
            items: menu.items,
          }
        : {
            name: '',
            items: [],
          },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const menuItems = form.watch('items');

  const { totalCost, totalRevenue, totalProfit } = useMemo(() => {
    const cost = menuItems.reduce((acc, item) => acc + (item.totalCost || 0), 0);
    const revenue = menuItems.reduce((acc, item) => acc + (item.sellingPrice || 0), 0);
    const profit = revenue - cost;
    return { totalCost: cost, totalRevenue: revenue, totalProfit: profit };
  }, [menuItems]);


  useEffect(() => {
    const qRecipes = query(collection(db, 'recipes'));
    const unsubscribeRecipes = onSnapshot(
      qRecipes,
      (querySnapshot) => {
        const recipeData: Recipe[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.isSubRecipe) {
            recipeData.push({ id: doc.id, ...data } as Recipe);
          }
        });
        setRecipes(recipeData.sort((a, b) => a.name.localeCompare(b.name)));
      },
      (error) => {
        console.error('Failed to fetch recipes:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load recipes. Please try again later.',
        });
      }
    );

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
        description: `Failed to ${
          mode === 'add' ? 'add' : 'update'
        } menu. Please try again.`,
      });
    } finally {
      setLoading(false);
    }
  }

  const handleRecipeAdd = (recipe: Recipe) => {
    append({
        recipeId: recipe.id,
        name: recipe.name,
        category: recipe.category,
        totalCost: recipe.totalCost,
        sellingPrice: 0,
    });
    setOpenRecipePopover(false);
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

          <Card>
            <CardHeader>
                <CardTitle>Menu Items</CardTitle>
            </CardHeader>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Recipe</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="w-[150px] text-right">Selling Price</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead className='w-[50px]'></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {fields.map((field, index) => {
                        const cost = form.watch(`items.${index}.totalCost`);
                        const price = form.watch(`items.${index}.sellingPrice`);
                        const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

                        return (
                            <TableRow key={field.id}>
                                <TableCell className="font-medium">{form.watch(`items.${index}.name`)}</TableCell>
                                <TableCell className="text-muted-foreground">{form.watch(`items.${index}.category`)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(cost)}</TableCell>
                                <TableCell className="text-right">
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.sellingPrice`}
                                        render={({ field: priceField }) => (
                                        <FormItem>
                                            <FormControl>
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                className="text-right"
                                                {...priceField}
                                            />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell className="text-right font-medium">{margin.toFixed(1)}%</TableCell>
                                <TableCell>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive h-9 w-9"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
             <CardFooter className="flex-col items-start gap-4 !p-6">
                <Popover open={openRecipePopover} onOpenChange={setOpenRecipePopover}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            role="combobox"
                            aria-expanded={openRecipePopover}
                            className="w-[250px] justify-between"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add a recipe...
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput placeholder="Search recipes..." />
                            <CommandList>
                                <CommandEmpty>No recipes found.</CommandEmpty>
                                <CommandGroup>
                                    {recipes.map((recipe) => (
                                    <CommandItem
                                        key={recipe.id}
                                        value={recipe.name}
                                        onSelect={() => handleRecipeAdd(recipe)}
                                    >
                                        <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            fields.some(item => item.recipeId === recipe.id) ? "opacity-100" : "opacity-0"
                                        )}
                                        />
                                        {recipe.name}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                 <FormMessage className={cn(!form.formState.errors.items ? "hidden" : "")}>
                    {form.formState.errors.items?.root?.message || form.formState.errors.items?.message}
                </FormMessage>
             </CardFooter>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Menu Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-lg font-bold">{formatCurrency(totalCost)}</p>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Potential Revenue</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Potential Profit</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(totalProfit)}</p>
                    </div>
                </div>
            </CardContent>
          </Card>
        </fieldset>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
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
