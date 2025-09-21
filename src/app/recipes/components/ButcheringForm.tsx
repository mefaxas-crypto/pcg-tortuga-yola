

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
import { Check, ChevronsUpDown, Pencil, PlusCircle, Trash2, Percent } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import type { InventoryItem, ButcheryTemplate as ButcheryTemplateType, YieldItem } from '@/lib/types';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { allUnits, Unit, convert } from '@/lib/conversions';
import { addButcheryTemplate, logButchering } from '@/lib/actions';
import { butcheryTemplates as initialButcheryTemplates } from '@/lib/butchery-templates.json';
import { InventoryItemFormSheet } from '@/app/inventory/components/InventoryItemFormSheet';
import { ButcheringTemplateDialog } from './ButcheringTemplateDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  primaryItemId: z.string().min(1, 'Please select a primary item to butcher.'),
  quantityUsed: z.coerce.number().min(0.01, 'Quantity must be greater than 0.'),
  quantityUnit: z.string().min(1, 'Unit is required.'),
  yieldedItems: z
    .array(
      z.object({
        itemId: z.string().min(1, 'Item ID is missing.'),
        name: z.string().min(1, 'Item name is required.'),
        weight: z.coerce.number().min(0, 'Weight must be a positive number.'),
        unit: z.string().min(1, 'Unit is required.'),
        materialCode: z.string(),
        costDistributionPercentage: z.coerce.number().min(0),
      }),
    )
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

  const { fields, append, remove } = useFieldArray({
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

  const totalYieldedWeightInKg = useMemo(() => {
    return yieldedItems.reduce((sum, item) => {
      const inventoryItem = inventory.find(i => i.id === item.itemId);
      if (!inventoryItem) return sum;

      let itemWeightInKg = 0;
      if (item.unit === 'un.') {
        // Convert unit back to its base weight/volume, then to kg
        const weightPerUnit = inventoryItem.recipeUnitConversion || 0; // e.g., 6oz
        const baseUnitOfItem = inventoryItem.recipeUnit; // e.g., oz
        const totalWeightInBase = item.weight * weightPerUnit; // e.g., 5 un. * 6oz = 30oz
        itemWeightInKg = convert(totalWeightInBase, baseUnitOfItem, 'kg');
      } else {
        itemWeightInKg = convert(item.weight, item.unit as Unit, 'kg');
      }
      return sum + (itemWeightInKg || 0);
    }, 0);
  }, [yieldedItems, inventory]);

  const quantityUsedInKg = convert(quantityUsed, quantityUnit as Unit, 'kg');
  const yieldPercentage = quantityUsedInKg > 0 ? (totalYieldedWeightInKg / quantityUsedInKg) * 100 : 0;
  const lossPercentage = 100 - yieldPercentage;

  const handleAddYieldedItemFromTemplate = (templateYield: YieldItem) => {
    const yieldedInventoryItem = inventory.find(i => i.materialCode === templateYield.id);
    if (!yieldedInventoryItem) {
      toast({
        variant: 'destructive',
        title: 'Item not in Inventory',
        description: `The yielded item "${templateYield.name}" from the template does not exist in your inventory. Please add it first.`,
      });
      return;
    }
    if (fields.some(field => field.itemId === yieldedInventoryItem.id)) {
      toast({
        variant: 'destructive',
        title: 'Item already added',
        description: `"${templateYield.name}" is already in the yielded items list.`,
      });
      return;
    }
    append({
      itemId: yieldedInventoryItem.id,
      name: yieldedInventoryItem.name,
      weight: 0,
      unit: yieldedInventoryItem.purchaseUnit,
      materialCode: yieldedInventoryItem.materialCode,
      costDistributionPercentage: templateYield.costDistributionPercentage,
    });
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
        const primaryItem = inventory.find(i => i.id === values.primaryItemId);
        if (!primaryItem) throw new Error("Primary item not found");

      const finalData = {
        ...values,
        primaryItemMaterialCode: primaryItem.materialCode,
        yieldedItems: values.yieldedItems.map(item => {
            const itemWeightInKg = convert(item.weight, item.unit as Unit, 'kg');
            const quantityUsedInKg = convert(values.quantityUsed, values.quantityUnit as Unit, 'kg');
            return {
                ...item,
                yieldPercentage: (itemWeightInKg / quantityUsedInKg) * 100,
            }
        })
      }
      await logButchering(finalData);
      toast({
        title: 'Butchering Logged!',
        description: 'Inventory has been updated and butchery template saved.',
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
  const showSummary = yieldedItems.every(item => item.weight > 0) && quantityUsed > 0 && yieldedItems.length > 0;

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
                                  form.setValue('yieldedItems', []); // Clear yielded items when primary changes
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
                  <TableHead className="w-[120px]">Weight / Qty</TableHead>
                  <TableHead className="w-[80px]">Unit</TableHead>
                  <TableHead className="w-[150px]">Cost Distribution</TableHead>
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
                            render={({ field }) => ( <Input type="number" step="any" {...field} /> )}
                        />
                      </TableCell>
                       <TableCell className='text-muted-foreground'>
                        {field.unit}
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`yieldedItems.${index}.costDistributionPercentage`}
                          render={({ field }) => (
                            <div className="relative">
                               <Input type="number" className='pr-6 text-right' {...field} />
                               <Percent className="absolute right-1.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        />
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
                            Add items from a template or create new custom yield cuts.
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
                            <div className="flex items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button type="button" variant="outline">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add From Template
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search yield cuts..." />
                                            <CommandList>
                                                <CommandEmpty>No cuts found in template.</CommandEmpty>
                                                <CommandGroup>
                                                    {activeTemplate.yields.map((yieldItem) => (
                                                        <CommandItem
                                                            key={yieldItem.id}
                                                            value={yieldItem.name}
                                                            onSelect={() => handleAddYieldedItemFromTemplate(yieldItem)}
                                                            className="flex justify-between items-center"
                                                        >
                                                            <span>{yieldItem.name}</span>
                                                            <Check className={cn("h-4 w-4", fields.some(f => inventory.find(i => i.materialCode === yieldItem.id)?.id === f.itemId) ? "opacity-100" : "opacity-0")} />
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Button type="button" variant="secondary" size="icon" onClick={() => openTemplateDialog('edit')}>
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit Template</span>
                                </Button>
                            </div>
                        ) : (
                            <div className='flex flex-col gap-2'>
                                <Button type="button" variant='outline' onClick={() => openTemplateDialog('add')}>
                                    <PlusCircle className='mr-2 h-4 w-4' />
                                    Create New Template
                                </Button>
                                <p className='text-xs text-muted-foreground'>No template found for this item.</p>
                            </div>
                        )}
                        <Separator orientation='vertical' className='h-10 mx-2' />
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
    {(activeTemplate || dialogMode === 'add') && primaryItem && (
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
