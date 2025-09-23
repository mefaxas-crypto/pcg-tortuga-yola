
'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormMessage,
} from '@/components/ui/form';
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
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { logProduction } from '@/lib/actions';
import { db } from '@/lib/firebase';
import type { Recipe } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Flame, PlusCircle, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOutletContext } from '@/context/OutletContext';

const formSchema = z.object({
  items: z
    .array(
      z.object({
        recipeId: z.string().min(1, 'Please select a sub-recipe.'),
        name: z.string(),
        yield: z.number(),
        yieldUnit: z.string(),
        quantityProduced: z.coerce
          .number()
          .min(0.01, 'Quantity must be > 0.'),
      })
    )
    .min(1, 'Please add at least one sub-recipe to produce.'),
});

export function ProductionForm() {
  const [loading, setLoading] = useState(false);
  const [subRecipes, setSubRecipes] = useState<Recipe[]>([]);
  const { toast } = useToast();
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const { selectedOutlet } = useOutletContext();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    const q = query(
      collection(db, 'recipes'),
      where('isSubRecipe', '==', true)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const recipesData: Recipe[] = [];
      querySnapshot.forEach((doc) => {
        recipesData.push({ id: doc.id, ...doc.data() } as Recipe);
      });
      setSubRecipes(recipesData.sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => unsubscribe();
  }, []);

  const handleAddRecipe = (recipe: Recipe) => {
    if (fields.some((item) => item.recipeId === recipe.id)) {
      toast({
        variant: 'destructive',
        title: 'Sub-recipe already added',
        description: `"${recipe.name}" is already in the production list.`,
      });
      return;
    }
    append({
      recipeId: recipe.id,
      name: recipe.name,
      yield: recipe.yield || 1,
      yieldUnit: recipe.yieldUnit || 'batch',
      quantityProduced: 1,
    });
    setPopoverOpen(false);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!selectedOutlet) {
      toast({
        variant: 'destructive',
        title: 'No Outlet Selected',
        description: 'Please select an outlet before logging production.',
      });
      return;
    }
    setLoading(true);

    try {
      await logProduction(values, selectedOutlet.id);
      toast({
        title: 'Production Logged!',
        description: `Inventory has been updated for all produced items at ${selectedOutlet.name}.`,
      });
      form.reset({ items: [] });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sub-Recipe</TableHead>
                <TableHead>Yield per Batch</TableHead>
                <TableHead className="w-[150px]">Batches Produced</TableHead>
                <TableHead className="w-[50px]">
                  <span className="sr-only">Remove</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell className="font-medium">{field.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {field.yield} {field.yieldUnit}
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantityProduced`}
                      render={({ field }) => (
                        <Input type="number" {...field} />
                      )}
                    />
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
              ))}
              {fields.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No sub-recipes added for production.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full md:w-[300px] justify-between"
                  disabled={!selectedOutlet}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Sub-Recipe to Log
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Search sub-recipes..." />
                  <CommandList>
                    <CommandEmpty>No sub-recipes found.</CommandEmpty>
                    <CommandGroup>
                      {subRecipes.map((recipe) => (
                        <CommandItem
                          key={recipe.id}
                          value={recipe.name}
                          onSelect={() => handleAddRecipe(recipe)}
                          className="flex justify-between items-center"
                        >
                           <span>{recipe.name}</span>
                           <Check className={cn("h-4 w-4", fields.some(i => i.recipeId === recipe.id) ? 'opacity-100' : 'opacity-0')} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage>
              {form.formState.errors.items?.message ||
                form.formState.errors.items?.root?.message}
            </FormMessage>
          </div>

          <Button
            type="submit"
            disabled={loading || fields.length === 0 || !selectedOutlet}
          >
            {loading ? 'Processing...' : 'Log All Production'}
            <Flame className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}
