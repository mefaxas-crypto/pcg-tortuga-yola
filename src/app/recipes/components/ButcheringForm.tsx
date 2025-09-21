'use client';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import type { InventoryItem } from '@/lib/types';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { allUnits, Unit } from '@/lib/conversions';
import { logButchering } from '@/lib/actions';

const formSchema = z.object({
  primaryItemId: z.string().min(1, 'Please select a primary item to butcher.'),
  quantityUsed: z.coerce.number().min(0.01, 'Quantity must be greater than 0.'),
  quantityUnit: z.string().min(1, 'Unit is required.'),
  yieldedItems: z
    .array(
      z.object({
        name: z.string().min(1, 'Item name is required.'),
        weight: z.coerce.number().min(0.01, 'Weight must be greater than 0.'),
      }),
    )
    .min(1, 'You must have at least one yielded item.'),
});

export function ButcheringForm() {
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      primaryItemId: '',
      quantityUsed: 1,
      quantityUnit: 'kg',
      yieldedItems: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'yieldedItems',
  });

  useEffect(() => {
    const q = query(collection(db, 'inventory'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invItems: InventoryItem[] = [];
      snapshot.forEach((doc) => {
        invItems.push({ id: doc.id, ...doc.data() } as InventoryItem);
      });
      setInventory(invItems.sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => unsubscribe();
  }, []);
  
  const quantityUsed = form.watch('quantityUsed');
  const yieldedItems = form.watch('yieldedItems');
  const totalYieldedWeight = yieldedItems.reduce((sum, item) => sum + (item.weight || 0), 0);
  const yieldPercentage = quantityUsed > 0 ? (totalYieldedWeight / quantityUsed) * 100 : 0;
  const lossPercentage = 100 - yieldPercentage;


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const finalData = {
        ...values,
        yieldedItems: values.yieldedItems.map(item => ({
          ...item,
          yieldPercentage: (item.weight / values.quantityUsed) * 100,
        }))
      }
      await logButchering(finalData);
      toast({
        title: 'Butchering Logged!',
        description: 'Inventory has been updated with yielded items and stock has been depleted.',
      });
      form.reset({
        primaryItemId: '',
        quantityUsed: 1,
        quantityUnit: 'kg',
        yieldedItems: [],
      });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Error Logging Butchering',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <fieldset disabled={loading} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="primaryItemId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Primary Item</FormLabel>
                  <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'justify-between',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {field.value
                            ? inventory.find(
                                (item) => item.id === field.value,
                              )?.name
                            : 'Select item to butcher'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width)] p-0">
                      <Command>
                        <CommandInput placeholder="Search inventory..." />
                        <CommandList>
                          <CommandEmpty>No items found.</CommandEmpty>
                          <CommandGroup>
                            {inventory.map((item) => (
                              <CommandItem
                                value={item.name}
                                key={item.id}
                                onSelect={() => {
                                  form.setValue('primaryItemId', item.id);
                                  form.setValue('quantityUnit', item.unit);
                                  setPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    item.id === field.value
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                {item.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The main cut of meat or fish you are breaking down.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantityUsed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Used</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" {...field} />
                  </FormControl>
                   <FormDescription>
                    How much of the primary item was used.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="quantityUnit"
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
                        {Object.keys(allUnits).map((unitKey) => (
                          <SelectItem key={unitKey} value={unitKey}>
                            {(allUnits as any)[unitKey].name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                    The unit for the quantity used.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Yielded Item Name</TableHead>
                  <TableHead className="w-[150px]">Weight</TableHead>
                  <TableHead className="w-[100px]">Unit</TableHead>
                  <TableHead className="w-[150px] text-right">Yield %</TableHead>
                  <TableHead className="w-[50px]"><span className='sr-only'>Remove</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const itemWeight = form.getValues(`yieldedItems.${index}.weight`);
                  const itemYield = quantityUsed > 0 ? (itemWeight / quantityUsed) * 100 : 0;
                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                            control={form.control}
                            name={`yieldedItems.${index}.name`}
                            render={({ field }) => (
                                <Input placeholder="e.g. Beef Fillet 8oz" {...field} />
                            )}
                        />
                      </TableCell>
                       <TableCell>
                        <FormField
                            control={form.control}
                            name={`yieldedItems.${index}.weight`}
                            render={({ field }) => (
                                <Input type="number" step="any" {...field} />
                            )}
                        />
                      </TableCell>
                       <TableCell className='text-muted-foreground'>
                        kg
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{itemYield.toFixed(2)}%</TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {fields.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                            No yielded items added yet.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className='flex justify-between items-start'>
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ name: '', weight: 0 })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Yielded Item
            </Button>
            <div className='w-full max-w-sm space-y-2'>
              <div className='flex justify-between font-medium'>
                <span>Total Yield Weight:</span>
                <span>{totalYieldedWeight.toFixed(3)} {form.getValues('quantityUnit')}</span>
              </div>
              <div className='flex justify-between font-medium text-primary'>
                <span>Total Yield %:</span>
                <span>{yieldPercentage.toFixed(2)}%</span>
              </div>
              <div className='flex justify-between font-medium text-destructive'>
                <span>Loss %:</span>
                <span>{lossPercentage.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </fieldset>
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Logging..." : "Log Butchering"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
