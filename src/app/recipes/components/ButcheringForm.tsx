

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
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import type { InventoryItem, ButcheryTemplate as ButcheryTemplateType } from '@/lib/types';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { allUnits, Unit, convert } from '@/lib/conversions';
import { logButchering } from '@/lib/actions';
import { InventoryItemFormSheet } from '@/app/inventory/components/InventoryItemFormSheet';
import { useRouter } from 'next/navigation';

const yieldItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is missing.'),
  name: z.string().min(1, 'Item name is required.'),
  weight: z.coerce.number().min(0, 'Weight must be a positive number.'),
  unit: z.string().min(1, 'Unit is required.'),
  materialCode: z.string(),
  costDistributionPercentage: z.coerce.number().min(0),
  fullDetails: z.custom<InventoryItem>().optional(),
});

const formSchema = z.object({
  primaryItemId: z.string().min(1, 'Please select a primary item to butcher.'),
  quantityUsed: z.coerce.number().min(0.01, 'Quantity must be greater than 0.'),
  quantityUnit: z.string().min(1, 'Unit is required.'),
  yieldedItems: z
    .array(yieldItemSchema)
    .min(1, 'You must have at least one yielded item.'),
});

export function ButcheringForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [isNewItemSheetOpen, setNewItemSheetOpen] = useState(false);
  const [butcheryTemplates, setButcheryTemplates] = useState<ButcheryTemplateType[]>([]);
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

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'yieldedItems',
  });

  useEffect(() => {
    const qInv = query(collection(db, 'inventory'));
    const unsubscribeInv = onSnapshot(qInv, (snapshot) => {
      const invItems: InventoryItem[] = [];
      snapshot.forEach((doc) => {
        invItems.push({ id: doc.id, ...doc.data() } as InventoryItem);
      });
      setInventory(invItems.sort((a, b) => a.name.localeCompare(b.name)));
    });

    const qTemplates = query(collection(db, 'butcheryTemplates'));
    const unsubscribeTemplates = onSnapshot(qTemplates, (snapshot) => {
        const templates: ButcheryTemplateType[] = [];
        snapshot.forEach((doc) => {
            templates.push({ id: doc.id, ...doc.data() } as ButcheryTemplateType);
        });
        setButcheryTemplates(templates);
    });

    return () => {
        unsubscribeInv();
        unsubscribeTemplates();
    };
  }, []);
  
  const quantityUsed = form.watch('quantityUsed');
  const quantityUnit = form.watch('quantityUnit');
  const yieldedItems = form.watch('yieldedItems');
  const primaryItemId = form.watch('primaryItemId');

  const activeTemplate = useMemo(() => {
    const primaryItem = inventory.find(i => i.id === primaryItemId);
    if (!primaryItem) return null;
    return butcheryTemplates.find(t => t.primaryItemMaterialCode === primaryItem.materialCode) || null;
  }, [primaryItemId, inventory, butcheryTemplates]);

  useEffect(() => {
    if (activeTemplate) {
        const templateYields = activeTemplate.yields.map(templateYield => {
            const yieldedInventoryItem = inventory.find(i => i.materialCode === templateYield.id);
            if (!yieldedInventoryItem) {
                console.warn(`Item with material code ${templateYield.id} from template not found in inventory.`);
                return null;
            }
            return {
                itemId: yieldedInventoryItem.id,
                name: yieldedInventoryItem.name,
                weight: 0,
                unit: yieldedInventoryItem.purchaseUnit,
                materialCode: yieldedInventoryItem.materialCode,
                costDistributionPercentage: templateYield.costDistributionPercentage,
                fullDetails: yieldedInventoryItem,
            };
        }).filter(item => item !== null) as z.infer<typeof yieldItemSchema>[];

        replace(templateYields);
    } else {
        replace([]); // Clear items if no template
    }
  }, [activeTemplate, inventory, replace]);

  const { totalYieldWeight, yieldPercentage, lossPercentage } = useMemo(() => {
    if (quantityUsed <= 0 || yieldedItems.length === 0 || yieldedItems.some(i => !i.fullDetails)) {
      return { totalYieldWeight: 0, yieldPercentage: 0, lossPercentage: 100 };
    }
  
    try {
      const quantityUsedInGrams = convert(quantityUsed, quantityUnit as Unit, 'g');
      if (quantityUsedInGrams <= 0) {
        return { totalYieldWeight: 0, yieldPercentage: 0, lossPercentage: 100 };
      }
      
      const totalYieldInGrams = yieldedItems.reduce((sum, item) => {
        if (!item.fullDetails || item.weight <= 0) return sum;
  
        const details = item.fullDetails;
        let itemWeightInGrams = 0;
  
        // `item.weight` is the quantity entered by the user (e.g., 5 units, or 1 lb)
        // `details.purchaseUnit` is the unit for that quantity (e.g., 'un.', 'lbs')
  
        if (details.purchaseUnit === 'un.') {
            // For 'un.' items, we need to convert the number of units to a weight.
            // e.g., 5 un. * (6 oz / un.) -> convert to grams
            if (details.recipeUnit && details.recipeUnitConversion > 0) {
                const totalWeightInRecipeUnits = item.weight * details.recipeUnitConversion;
                itemWeightInGrams = convert(totalWeightInRecipeUnits, details.recipeUnit as Unit, 'g');
            }
        } else {
            // For weight-based items, just convert the entered weight to grams.
            itemWeightInGrams = convert(item.weight, details.purchaseUnit as Unit, 'g');
        }
        
        return sum + itemWeightInGrams;
      }, 0);
      
      const yieldPerc = (totalYieldInGrams / quantityUsedInGrams) * 100;
      
      return {
        totalYieldWeight: totalYieldInGrams / 1000, // convert back to kg for display
        yieldPercentage: isFinite(yieldPerc) ? yieldPerc : 0,
        lossPercentage: 100 - (isFinite(yieldPerc) ? yieldPerc : 0),
      };
    } catch (error) {
      console.error("Error calculating yield:", error);
      return { totalYieldWeight: 0, yieldPercentage: 0, lossPercentage: 100 };
    }
  
  }, [yieldedItems, quantityUsed, quantityUnit]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const primaryItem = inventory.find(i => i.id === values.primaryItemId);
      if (!primaryItem) throw new Error("Primary item not found");

      const producedItems = values.yieldedItems.filter(item => item.weight > 0);

      if (producedItems.length === 0) {
        toast({
          variant: "destructive",
          title: "No Yield Entered",
          description: "Please enter a weight/quantity for at least one yielded item.",
        });
        setLoading(false);
        return;
      }

      const totalCostDistribution = producedItems.reduce((sum, item) => sum + item.costDistributionPercentage, 0);
      const itemsWithFinalCost = producedItems.map(item => ({
        ...item,
        finalCostDistribution: totalCostDistribution > 0 ? (item.costDistributionPercentage / totalCostDistribution) * 100 : (1 / producedItems.length) * 100, // Fallback to even distribution
      }));

      const finalData = {
        ...values,
        yieldedItems: itemsWithFinalCost,
      };

      await logButchering(finalData);
      toast({
        title: 'Butchering Logged!',
        description: 'Inventory has been updated.',
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


  const handleNewItemSheetClose = () => {
    setNewItemSheetOpen(false);
  }

  const handleNewItemCreated = (newItem: InventoryItem) => {
    append({
        itemId: newItem.id,
        name: newItem.name,
        weight: 0,
        unit: newItem.purchaseUnit,
        materialCode: newItem.materialCode,
        costDistributionPercentage: 0,
        fullDetails: newItem,
    });
    setNewItemSheetOpen(false); 
  };

  const primaryItem = inventory.find(i => i.id === primaryItemId);

  return (
    <>
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
                                  form.setValue('quantityUnit', item.purchaseUnit);
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
                  <TableHead>Yielded Item</TableHead>
                  <TableHead className="w-[150px]">Weight / Qty</TableHead>
                  <TableHead className="w-[120px]">Unit</TableHead>
                  <TableHead className="w-[50px]"><span className='sr-only'>Remove</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  return (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">
                        {field.name}
                      </TableCell>
                       <TableCell>
                        <FormField
                            control={form.control}
                            name={`yieldedItems.${index}.weight`}
                            render={({ field }) => ( <Input type="number" step="any" placeholder="0" {...field} /> )}
                        />
                      </TableCell>
                       <TableCell className='text-muted-foreground'>
                        {allUnits[field.unit as Unit]?.name || field.unit}
                      </TableCell>
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
                            {primaryItemId ? 'No template found for this item. Create or edit templates in Settings.' : 'Select a primary item to begin.'}
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
            <div className="p-4 space-y-2 rounded-lg border">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total Yield Weight:</span>
                    <span className="font-medium">{totalYieldWeight.toFixed(3)} kg</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total Yield %:</span>
                    <span className="font-medium text-green-600">{yieldPercentage.toFixed(2)}%</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Loss %:</span>
                    <span className="font-medium text-destructive">{lossPercentage.toFixed(2)}%</span>
                </div>
            </div>

          <div className='flex flex-col sm:flex-row justify-between items-start gap-4'>
            <div className="flex items-center gap-2">
                {primaryItemId && (
                    <>
                        <Button
                            type="button"
                            variant="link"
                            className='p-0 h-auto self-center'
                            onClick={() => setNewItemSheetOpen(true)}
                        >
                             <PlusCircle className="mr-2 h-3 w-3" />
                            Add Custom Yield Item
                        </Button>
                    </>
                )}
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
    <InventoryItemFormSheet 
        open={isNewItemSheetOpen}
        onClose={handleNewItemSheetClose}
        onItemCreated={handleNewItemCreated}
        mode="add"
        isInternalCreation={true}
        internalCreationCategory={primaryItem?.category}
    />
    </>
  );
}
