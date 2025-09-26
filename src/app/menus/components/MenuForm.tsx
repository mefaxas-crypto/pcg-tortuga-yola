
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next-intl';
import { useEffect, useState, useMemo } from 'react';
import type { Menu, Recipe } from '@/lib/types';
import { addMenu, editMenu } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { collection, query } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';
import { useCollection, useFirebase } from '@/firebase';

const formSchema = z.object({
  name: z.string().min(2, 'Menu name must be at least 2 characters.'),
  items: z.array(z.object({
    recipeId: z.string(),
    name: z.string(),
    category: z.string(),
    totalCost: z.number(),
    sellingPrice: z.coerce.number().min(0, 'Price must be positive.'),
  })).min(1, 'A menu must have at least one item.'),
});

type MenuFormProps = {
  mode: 'add' | 'edit';
  menu?: Menu;
};

export function MenuForm({ mode, menu }: MenuFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isRecipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const { firestore } = useFirebase();

  const recipesQuery = useMemo(() => firestore ? query(collection(firestore, 'recipes')) : null, [firestore]);
  const { data: recipesData } = useCollection<Recipe>(recipesQuery);
  const recipes = (recipesData || []).sort((a, b) => a.name.localeCompare(b.name));

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (mode === 'edit' && menu) {
      form.reset({
        name: menu.name,
        items: menu.items || [],
      });
    }
  }, [menu, mode, form]);

  const handleRecipeAdd = (recipe: Recipe) => {
    // Check if recipe is already in the menu
    if (fields.some(item => item.recipeId === recipe.id)) {
      toast({
        variant: 'destructive',
        title: 'Recipe already exists',
        description: `"${recipe.name}" is already in this menu.`
      });
      return;
    }
    
    append({
      recipeId: recipe.id,
      name: recipe.name,
      category: recipe.category,
      totalCost: recipe.totalCost,
      sellingPrice: 0,
    });
    setRecipeDialogOpen(false);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      if (mode === 'edit' && menu) {
        await editMenu(menu.id, values);
        toast({ title: 'Menu Updated', description: `"${values.name}" has been updated.` });
      } else {
        await addMenu(values);
        toast({ title: 'Menu Added', description: `"${values.name}" has been created.` });
      }
      router.push('/menus');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${mode === 'add' ? 'add' : 'update'} menu.`,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <fieldset disabled={loading} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Menu Details</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Menu Items</CardTitle>
              <CardDescription>
                Add recipes to this menu and set their selling price.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipe Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="w-[150px] text-right">Selling Price</TableHead>
                    <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.category}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalCost)}</TableCell>
                      <TableCell className="text-right">
                        <FormField
                            control={form.control}
                            name={`items.${index}.sellingPrice`}
                            render={({ field }) => (
                                <Input
                                    type="number"
                                    step="0.01"
                                    className="text-right"
                                    {...field}
                                />
                            )}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {fields.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                    No items added yet.
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
               <Dialog open={isRecipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Recipe
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Select a Recipe to Add</DialogTitle>
                  </DialogHeader>
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search for a recipe..." />
                    <CommandList>
                      <CommandEmpty>No recipes found.</CommandEmpty>
                      <CommandGroup>
                        {recipes.map((recipe) => (
                          <CommandItem
                            key={recipe.id}
                            value={recipe.name}
                            onSelect={() => handleRecipeAdd(recipe)}
                            className="flex justify-between items-center"
                          >
                            <span>{recipe.name}</span>
                            <Check className={cn("h-4 w-4", fields.some(i => i.recipeId === recipe.id) ? 'opacity-100' : 'opacity-0')} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </DialogContent>
              </Dialog>
              <FormMessage>{form.formState.errors.items?.message}</FormMessage>
            </CardFooter>
          </Card>
        </fieldset>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/menus')}>
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
