

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { addInventoryItem, editInventoryItem } from '@/lib/actions';
import { useEffect, useState } from 'react';
import type { Supplier, InventoryItem, Allergen } from '@/lib/types';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { SupplierFormSheet } from '@/app/suppliers/components/SupplierFormSheet';
import { PlusCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { allUnits } from '@/lib/conversions';
import { UnitConversionDialog } from './UnitConversionDialog';

const formSchema = z.object({
  materialCode: z.string().min(1, 'SAP Code is required.'),
  name: z.string().min(2, 'Ingredient name must be at least 2 characters.'),
  category: z.string().min(1, 'Category is required.'),
  purchaseQuantity: z.coerce.number().min(0.0001, 'Purchase quantity must be positive.'),
  purchaseUnit: z.string().min(1, 'Purchase unit is required.'),
  purchasePrice: z.coerce.number().min(0, 'Cost must be a positive number.'),
  parLevel: z.coerce.number().min(0, 'Par level cannot be negative.'),
  supplierId: z.string().optional(),
  allergens: z.array(z.string()).optional(),
  // Internal fields, not shown on form but required for submission
  quantity: z.coerce.number().optional().default(0),
  recipeUnit: z.string().optional(),
  recipeUnitConversion: z.coerce.number().optional(),
});

type InventoryItemFormSheetProps = {
  open: boolean;
  mode: 'add' | 'edit';
  item?: InventoryItem;
  onClose: () => void;
  onItemCreated?: (newItem: InventoryItem) => void;
  isInternalCreation?: boolean;
};

const categories = ['Produce', 'Meat', 'Dairy', 'Dry Goods', 'Beverages', 'Other'];
const availableUnits = Object.keys(allUnits).map(key => ({
    value: key,
    label: allUnits[key as keyof typeof allUnits].name
}));

export function InventoryItemFormSheet({
  open,
  mode,
  item,
  onClose,
  onItemCreated,
  isInternalCreation = false,
}: InventoryItemFormSheetProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [isNewSupplierSheetOpen, setNewSupplierSheetOpen] = useState(false);
  const [isConversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<z.infer<typeof formSchema> | null>(null);

  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      materialCode: '',
      name: '',
      category: '',
      purchaseQuantity: 1,
      purchaseUnit: '',
      purchasePrice: 0,
      parLevel: 0,
      supplierId: '',
      allergens: [],
      quantity: 0,
    },
  });

  const commonReset = {
      materialCode: '',
      name: '',
      category: '',
      purchaseQuantity: 1,
      purchaseUnit: '',
      purchasePrice: 0,
      parLevel: 0,
      supplierId: '',
      allergens: [],
      quantity: 0,
      recipeUnit: undefined,
      recipeUnitConversion: undefined,
  };

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && item) {
        form.reset({
          ...commonReset,
          ...item,
          purchaseQuantity: item.purchaseQuantity,
          supplierId: item.supplierId || '',
          allergens: item.allergens || [],
        });
      } else if (isInternalCreation) {
        form.reset({
          ...commonReset,
          category: 'Meat', // Default category for butchered items
          purchaseUnit: 'kg',
          supplierId: '',
        });
      } else {
        form.reset(commonReset);
      }
    }
  }, [item, mode, form, open, isInternalCreation]);

  useEffect(() => {
    const qSuppliers = query(collection(db, 'suppliers'));
    const unsubscribeSuppliers = onSnapshot(qSuppliers, (querySnapshot) => {
      const suppliersData: Supplier[] = [];
      querySnapshot.forEach((doc) => {
        suppliersData.push({ id: doc.id, ...doc.data() } as Supplier);
      });
      setSuppliers(suppliersData.sort((a, b) => a.name.localeCompare(b.name)));
    });

    const qAllergens = query(collection(db, 'allergens'));
    const unsubscribeAllergens = onSnapshot(qAllergens, (querySnapshot) => {
      const allergensData: Allergen[] = [];
      querySnapshot.forEach((doc) => {
        allergensData.push({ id: doc.id, ...doc.data() } as Allergen);
      });
      setAllergens(allergensData.sort((a, b) => a.name.localeCompare(b.name)));
    });

    return () => {
      unsubscribeSuppliers();
      unsubscribeAllergens();
    };
  }, []);
  
  const handleClose = () => {
    if (!loading) {
      form.reset();
      onClose();
    }
  };

  const handleSupplierCreated = (newSupplier: Supplier) => {
    form.setValue('supplierId', newSupplier.id);
    setNewSupplierSheetOpen(false);
  }

  const completeSubmission = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
        if (mode === 'edit' && item) {
            await editInventoryItem(item.id, values);
             toast({
                title: 'Ingredient Updated',
                description: `"${values.name}" has been updated.`,
            });
            handleClose();
        } else {
            const newItem = await addInventoryItem(values);
            toast({
                title: 'Ingredient Added',
                description: `"${values.name}" has been added to your inventory.`,
            });
            if(onItemCreated && newItem) {
                onItemCreated(newItem);
            }
            handleClose();
        }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage.replace('Failed to add inventory item: ', '').replace('Failed to edit inventory item: ', ''),
      });
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // If the purchase unit is 'un.' and there is no conversion factor defined yet,
    // we must ask the user for it before we can save the item.
    if (values.purchaseUnit === 'un.' && !values.recipeUnitConversion) {
      setPendingFormValues(values);
      setConversionDialogOpen(true);
      return;
    }
    // For standard units, or 'un.' items that already have a conversion, proceed directly.
    await completeSubmission(values);
  }

  const handleConversionSubmit = (conversion: { recipeUnit: string; recipeUnitConversion: number; }) => {
    if (pendingFormValues) {
        const finalValues = { ...pendingFormValues, ...conversion };
        setConversionDialogOpen(false);
        setPendingFormValues(null);
        completeSubmission(finalValues);
    }
  };

  const allergenOptions = allergens.map(allergen => ({
    value: allergen.name,
    label: allergen.name,
  }));

  const formTitle = isInternalCreation ? 'Add New Yield Item' : (mode === 'add' ? 'Add New Ingredient' : 'Edit Ingredient');
  const formDescription = isInternalCreation 
    ? 'Enter details for this new cut. The supplier will be set to "In-house" automatically.' 
    : 'Enter the details of the ingredient as you would purchase it.';
  
  const purchaseUnit = form.watch('purchaseUnit');

  return (
    <>
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <Form {...form}>
          <SheetHeader>
            <SheetTitle>{formTitle}</SheetTitle>
            <SheetDescription>{formDescription}</SheetDescription>
          </SheetHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col h-full"
          >
            <div className="py-4 grid gap-6 flex-1">
              <fieldset disabled={loading} className="grid gap-6">

                {/* --- Header Fields --- */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <FormField
                    control={form.control}
                    name="materialCode"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Codigo Sap (SAP Code)</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., 1006335" {...field} />
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
                        <FormLabel>Material</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Extra Virgin Olive Oil" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem className='md:col-span-2'>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isInternalCreation}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {categories.map(category => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                </div>
                
                <Separator />
                <h4 className="text-lg font-medium">Purchase Info</h4>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                     <div className='md:col-span-2 grid grid-cols-3 gap-2 items-end'>
                         <FormField
                            control={form.control}
                            name="purchaseQuantity"
                            render={({ field }) => (
                                <FormItem className='col-span-1'>
                                <FormLabel>Purchase Qty</FormLabel>
                                <FormControl>
                                    <Input type="number" step="any" placeholder="e.g., 750" {...field} value={field.value || ''} disabled={isInternalCreation} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="purchaseUnit"
                            render={({ field }) => (
                                <FormItem className='col-span-1'>
                                <FormLabel>Purchase Unit</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isInternalCreation}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {availableUnits.map(unit => (
                                        <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                            control={form.control}
                            name="purchasePrice"
                            render={({ field }) => (
                                <FormItem className='col-span-1'>
                                <FormLabel>for (Price)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" placeholder="e.g., 24.99" {...field} value={field.value || ''} disabled={isInternalCreation} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                     </div>
                    {!isInternalCreation && (
                        <FormField
                            control={form.control}
                            name="supplierId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Vendor</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select a supplier" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {suppliers.map(supplier => (
                                    <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => setNewSupplierSheetOpen(true)}>
                                <PlusCircle className="mr-2 h-3 w-3" />
                                Create New Supplier
                                </Button>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                    <FormField
                        control={form.control}
                        name="parLevel"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Par Stock</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} value={field.value || ''} />
                            </FormControl>
                             <FormDescription className='text-xs'>Re-order point in purchase units (e.g. # of {purchaseUnit})</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
                 
                 <Separator />

                 <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <FormField
                        control={form.control}
                        name="allergens"
                        render={({ field }) => (
                        <FormItem className="md:col-span-2">
                            <FormLabel>Allergens</FormLabel>
                            <FormControl>
                            <MultiSelect
                                options={allergenOptions}
                                onValueChange={field.onChange}
                                defaultValue={field.value || []}
                                placeholder="Select allergens..."
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
              </fieldset>
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
    
    <SupplierFormSheet
      open={isNewSupplierSheetOpen}
      onClose={() => setNewSupplierSheetOpen(false)}
      mode="add"
      onSupplierCreated={handleSupplierCreated}
    />

    <UnitConversionDialog 
        open={isConversionDialogOpen}
        onOpenChange={setConversionDialogOpen}
        itemName={form.getValues('name')}
        onConfirm={handleConversionSubmit}
    />
    </>
  );
}
