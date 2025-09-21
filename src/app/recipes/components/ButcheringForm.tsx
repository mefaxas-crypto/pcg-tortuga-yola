

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
import { Check, ChevronsUpDown, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import type { InventoryItem, ButcheryTemplate as ButcheryTemplateType } from '@/lib/types';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { allUnits, Unit, convert } from '@/lib/conversions';
import { addButcheryTemplate, logButchering } from '@/lib/actions';
import { butcheryTemplates as initialButcheryTemplates } from '@/lib/butchery-templates.json';
import { InventoryItemFormSheet } from '@/app/inventory/components/InventoryItemFormSheet';
import { ButcheringTemplateDialog } from './ButcheringTemplateDialog';
import { Card, CardContent } from '@/components/ui/card';

const yieldItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is missing.'),
  name: z.string().min(1, 'Item name is required.'),
  weight: z.coerce.number().min(0, 'Weight must be a positive number.'),
  unit: z.string().min(1, 'Unit is required.'),
  materialCode: z.string(),
  costDistributionPercentage: z.coerce.number().min(0),
  // This object will be populated with the full inventory item details
  // for accurate frontend calculations. It is not submitted to the backend.
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
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [isNewItemSheetOpen, setNewItemSheetOpen] = useState(false);
  const [butcheryTemplates, setButcheryTemplates] = useState<ButcheryTemplateType[]>(initialButcheryTemplates);
  const [isTemplateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('edit');
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
  const quantityUnit = form.watch('quantityUnit');
  const yieldedItems = form.watch('yieldedItems');
  const primaryItemId = form.watch('primaryItemId');

  const activeTemplate = useMemo(() => {
    const primaryItem = inventory.find(i => i.id === primaryItemId);
    if (!primaryItem) return null;
    return butcheryTemplates.find(t => t.primaryItemMaterialCode === primaryItem.materialCode) || null;
  }, [primaryItemId, inventory, butcheryTemplates]);

  // --- Automatic Template Loading ---
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


  const totalYieldedWeightInKg = useMemo(() => {
    return yieldedItems.reduce((sum, item) => {
      if (item.weight === 0 || !item.fullDetails) return sum;
      let itemWeightInKg = 0;
      try {
        if (item.fullDetails.unit === 'un.') {
          const weightPerUnit = item.fullDetails.recipeUnitConversion || 0;
          const baseUnitOfItem = item.fullDetails.recipeUnit as Unit | undefined;
          
          if (!baseUnitOfItem || weightPerUnit === 0) {
             console.warn(`Cannot calculate weight for unit-based item '${item.name}' without conversion factor.`);
             return sum;
          }
          // e.g., 5 un. * 6oz/un = 30oz
          const totalWeightInBase = item.weight * weightPerUnit; 
          itemWeightInKg = convert(totalWeightInBase, baseUnitOfItem, 'kg');

        } else {
          itemWeightInKg = convert(item.weight, item.unit as Unit, 'kg');
        }
      } catch (error) {
          console.error("Error converting weight for yield calculation:", error);
          return sum;
      }
      return sum + (itemWeightInKg || 0);
    }, 0);
  }, [yieldedItems]);
  

  const quantityUsedInKg = convert(quantityUsed, quantityUnit as Unit, 'kg');
  const yieldPercentage = quantityUsedInKg > 0 ? (totalYieldedWeightInKg / quantityUsedInKg) * 100 : 0;
  const lossPercentage = 100 - yieldPercentage;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const primaryItem = inventory.find(i => i.id === values.primaryItemId);
      if (!primaryItem) throw new Error("Primary item not found");

      // Filter out items with 0 weight
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

      // Re-distribute cost percentage among produced items
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
  
  const handleTemplateUpdate = (updatedTemplate: ButcheryTemplateType) => {
    setButcheryTemplates(currentTemplates => 
      currentTemplates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t)
    );
    setTemplateDialogOpen(false);
  }
  
  const handleCreateTemplate = async (newTemplate: ButcheryTemplateType) => {
    try {
        await addButcheryTemplate(newTemplate);
        setButcheryTemplates(current => [...current, newTemplate]);
        toast({ title: 'Template Created!', description: `New template for "${newTemplate.name}" was saved.` });
        setTemplateDialogOpen(false);
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error Creating Template' });
    }
  };

  const openTemplateDialog = (mode: 'add' | 'edit') => {
    setDialogMode(mode);
    setTemplateDialogOpen(true);
  }

  const primaryItem = inventory.find(i => i.id === primaryItemId);
  const showSummary = yieldedItems.some(item => item.weight > 0) && quantityUsed > 0;


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
                            {primaryItemId ? 'No template found for this item. Create one or add custom yield items.' : 'Select a primary item to begin.'}
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className='flex flex-col sm:flex-row justify-between items-start gap-4'>
            <div className="flex items-center gap-2">
                {primaryItemId && (
                    <>
                        {activeTemplate ? (
                            <Button type="button" variant="secondary" size="sm" onClick={() => openTemplateDialog('edit')}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Template
                            </Button>
                        ) : (
                            <Button type="button" variant='outline' onClick={() => openTemplateDialog('add')}>
                                <PlusCircle className='mr-2 h-4 w-4' />
                                Create New Template
                            </Button>
                        )}
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

            {showSummary && (
                 <Card className="w-full max-w-sm">
                    <CardContent className="p-4 space-y-2">
                        <div className='flex justify-between text-sm'>
                            <span className='text-muted-foreground'>Total Yield Weight:</span>
                            <span className='font-medium'>{totalYieldedWeightInKg.toFixed(3)} kg</span>
                        </div>
                        <div className='flex justify-between text-sm'>
                            <span className='text-muted-foreground'>Total Yield %:</span>
                            <span className={cn('font-medium', yieldPercentage > 100 ? 'text-destructive' : 'text-primary')}>{yieldPercentage.toFixed(2)}%</span>
                        </div>
                        <div className='flex justify-between text-sm'>
                            <span className='text-muted-foreground'>Loss %:</span>
                            <span className={cn('font-medium', lossPercentage < 0 ? 'text-destructive' : 'text-muted-foreground')}>{lossPercentage.toFixed(2)}%</span>
                        </div>
                    </CardContent>
                </Card>
            )}
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
    {(dialogMode === 'add' || activeTemplate) && primaryItem && (
      <ButcheringTemplateDialog
        open={isTemplateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        template={activeTemplate || { 
            id: `template-${primaryItem.materialCode}-${Date.now()}`,
            name: `${primaryItem.name} Breakdown`,
            primaryItemMaterialCode: primaryItem.materialCode,
            yields: []
        }}
        inventoryItems={inventory}
        onTemplateUpdate={handleTemplateUpdate}
        onTemplateCreate={handleCreateTemplate}
        mode={dialogMode}
      />
    )}
    </>
  );
}
