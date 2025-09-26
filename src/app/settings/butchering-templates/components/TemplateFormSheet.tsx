

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { addButcheryTemplate, updateButcheryTemplate } from '@/lib/actions';
import { useEffect, useState, useMemo } from 'react';
import type { ButcheryTemplate, InventoryItem } from '@/lib/types';
import { query, where } from 'firebase/firestore';
import { Check, ChevronsUpDown, Percent, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useCollection, useFirebase } from '@/firebase';
import { collections } from '@/firebase/firestore/collections';
import { useAuth } from '@/context/AuthContext';

const yieldItemSchema = z.object({
    id: z.string(), // Material code
    name: z.string(),
    costDistributionPercentage: z.coerce.number().min(0).max(100),
});

const formSchema = z.object({
  name: z.string().min(3, 'Template name is required.'),
  primaryItemMaterialCode: z.string().min(1, 'Please select a primary item.'),
  yields: z.array(yieldItemSchema).min(1, 'Template must have at least one yield item.'),
});

type TemplateFormSheetProps = {
  open: boolean;
  mode: 'add' | 'edit';
  template?: ButcheryTemplate;
  onClose: () => void;
};

export function TemplateFormSheet({
  open,
  mode,
  template,
  onClose,
}: TemplateFormSheetProps) {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isPrimaryItemPopoverOpen, setPrimaryItemPopoverOpen] = useState(false);
  const [isYieldPopoverOpen, setYieldPopoverOpen] = useState(false);

  const inventoryQuery = useMemo(() => (firestore && user)
    ? query(collections.inventory(firestore), where('userId', '==', user.uid))
    : null, [firestore, user]);
  const { data: inventoryData } = useCollection(inventoryQuery);
  const inventory = useMemo(() => (inventoryData || []).sort((a,b) => a.name.localeCompare(b.name)), [inventoryData]);
  
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      primaryItemMaterialCode: '',
      yields: [],
    },
  });

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && template) {
        form.reset({
          name: template.name,
          primaryItemMaterialCode: template.primaryItemMaterialCode,
          yields: template.yields,
        });
      } else {
        form.reset({
          name: '',
          primaryItemMaterialCode: '',
          yields: [],
        });
      }
    }
  }, [template, mode, form, open]);

  const watchedYields = form.watch('yields');
  const totalDistribution = useMemo(() => {
    return watchedYields.reduce((sum, y) => sum + y.costDistributionPercentage, 0);
  }, [watchedYields]);


  const handleClose = () => {
    if (!loading) {
      form.reset();
      onClose();
    }
  };

  const handleAddYield = (item: InventoryItem) => {
    const currentYields = form.getValues('yields');
    if (currentYields.some(y => y.id === item.materialCode)) {
      toast({ variant: 'destructive', title: 'Item already in template' });
      return;
    }
    form.setValue('yields', [
        ...currentYields,
        { id: item.materialCode, name: item.name, costDistributionPercentage: 0 }
    ]);
    setYieldPopoverOpen(false);
  };

  const handleRemoveYield = (materialCode: string) => {
    form.setValue('yields', form.getValues('yields').filter(y => y.id !== materialCode));
  };
  
  const handleDistributionChange = (materialCode: string, value: string) => {
    const percentage = parseFloat(value);
    if (isNaN(percentage)) return;
    form.setValue('yields', form.getValues('yields').map(y => y.id === materialCode ? { ...y, costDistributionPercentage: percentage } : y));
  }
  

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if(totalDistribution !== 100) {
        toast({ variant: 'destructive', title: 'Invalid Distribution', description: `Cost distribution must total 100%. Current total is ${totalDistribution}%.` });
        return;
    }
    
    setLoading(true);
    try {
        if (mode === 'edit' && template) {
            await updateButcheryTemplate(template.id, values);
            toast({ title: 'Template Updated', description: `"${values.name}" has been updated.` });
        } else {
            await addButcheryTemplate(values);
            toast({ title: 'Template Added', description: `"${values.name}" has been created.` });
        }
        handleClose();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  const primaryItemMaterialCode = form.watch('primaryItemMaterialCode');

  const currentYields = form.watch('yields');
  const availableInventoryToAdd = inventory.filter(
    invItem => !currentYields.some(y => y.id === invItem.materialCode) && invItem.materialCode !== primaryItemMaterialCode
  );

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col h-full"
          >
            <SheetHeader>
              <SheetTitle>{mode === 'add' ? 'Create New' : 'Edit'} Butchering Template</SheetTitle>
              <SheetDescription>
                Define the yielded items and their cost distribution for a primary cut.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 grid gap-6 flex-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Salmon Filleting" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryItemMaterialCode"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Primary Item</FormLabel>
                     <Popover open={isPrimaryItemPopoverOpen} onOpenChange={setPrimaryItemPopoverOpen}>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant="outline" role="combobox" className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}>
                            {field.value ? inventory.find(item => item.materialCode === field.value)?.name : 'Select primary item'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search inventory..." />
                            <CommandList>
                            <CommandEmpty>No items found.</CommandEmpty>
                            <CommandGroup>
                                {inventory.map((item) => (
                                <CommandItem value={item.name} key={item.id} onSelect={() => {
                                    form.setValue('primaryItemMaterialCode', item.materialCode);
                                    if(!form.getValues('name')) form.setValue('name', `${item.name} Breakdown`);
                                    setPrimaryItemPopoverOpen(false);
                                }}>
                                    <Check className={cn('mr-2 h-4 w-4', item.materialCode === field.value ? 'opacity-100' : 'opacity-0')} />
                                    {item.name}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Separator />
               <div>
                    <h4 className="text-sm font-medium">Yields & Cost Distribution</h4>
                    <FormMessage>{form.formState.errors.yields?.message || form.formState.errors.yields?.root?.message}</FormMessage>
               </div>
               <div className="rounded-md border p-2 space-y-2 max-h-64 overflow-y-auto">
                    {currentYields.length > 0 ? (
                        currentYields.map(yieldItem => (
                        <div key={yieldItem.id} className="flex justify-between items-center p-2 rounded-md hover:bg-accent">
                            <div>
                                <p className="font-medium">{yieldItem.name}</p>
                                <p className="text-xs text-muted-foreground">{yieldItem.id}</p>
                            </div>
                            <div className='flex items-center gap-2'>
                                <div className='relative w-24'>
                                    <Input 
                                        type="number" 
                                        value={yieldItem.costDistributionPercentage}
                                        onChange={(e) => handleDistributionChange(yieldItem.id, e.target.value)}
                                        className="pr-6 text-right"
                                    />
                                    <Percent className="absolute right-1.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveYield(yieldItem.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center p-4">No yield items in this template.</p>
                    )}
               </div>
                <div className={cn("flex justify-end font-medium text-sm pr-2", totalDistribution !== 100 && "text-destructive")}>
                    Total: {totalDistribution}%
                </div>
              <Separator />

              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-medium">Add New Yield Item</h4>
                 <Popover open={isYieldPopoverOpen} onOpenChange={setYieldPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                            disabled={!primaryItemMaterialCode}
                        >
                            Select an inventory item to add...
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search inventory..." />
                            <CommandList>
                            <CommandEmpty>No items available to add.</CommandEmpty>
                            <CommandGroup>
                                {availableInventoryToAdd.map((item) => (
                                <CommandItem
                                    value={item.name}
                                    key={item.id}
                                    onSelect={() => handleAddYield(item)}
                                >
                                    <Check className={cn('mr-2 h-4 w-4', currentYields.some(y => y.id === item.materialCode) ? 'opacity-100' : 'opacity-0')} />
                                    {item.name}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
              </div>

            </div>
            <SheetFooter className="mt-auto pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
