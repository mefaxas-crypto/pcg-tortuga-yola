

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

const formSchema = z.object({
  materialCode: z.string().min(1, 'SAP Code is required.'),
  name: z.string().min(2, 'Ingredient name must be at least 2 characters.'),
  category: z.string().min(1, 'Category is required.'),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative.'),
  unit: z.string().optional(),
  purchaseUnit: z.string().min(1, 'Presentation/Purchase Unit is required.'),
  conversionFactor: z.coerce.number().min(0.0001, 'Conversion factor must be positive.'),
  parLevel: z.coerce.number().min(0, 'Par level cannot be negative.'),
  supplierId: z.string().optional(),
  purchasePrice: z.coerce.number().min(0, 'Cost must be a positive number.'),
  unitCost: z.coerce.number().min(0, 'Unit cost must be a positive number.'),
  allergens: z.array(z.string()).optional(),
});

type InventoryItemFormSheetProps = {
  open: boolean;
  mode: 'add' | 'edit';
  item?: InventoryItem;
  onClose: () => void;
  onItemCreated?: (newItem: InventoryItem) => void;
  isInternalCreation?: boolean;
};

// --- Standardized Unit Definitions ---

const categories = ['Produce', 'Meat', 'Dairy', 'Dry Goods', 'Beverages', 'Other'];

const purchaseUnits = [
    'Case', 'Box', 'Bottle', 'Bag', 'Jar', 'Can', 'Carton',
    'kg', 'lb', 'l', 'gal', 'Each', 'Unit', 'Pack',
    'Butchery', 'Production',
];


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
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      materialCode: '',
      name: '',
      category: '',
      quantity: 0,
      unit: '',
      purchaseUnit: '',
      conversionFactor: 1,
      parLevel: 0,
      supplierId: '',
      purchasePrice: 0,
      unitCost: 0,
      allergens: [],
    },
  });

  const purchasePrice = form.watch('purchasePrice');
  const conversionFactor = form.watch('conversionFactor');

  useEffect(() => {
    if (purchasePrice !== undefined && conversionFactor > 0) {
      const newUnitCost = purchasePrice / conversionFactor;
      form.setValue('unitCost', newUnitCost, { shouldValidate: true });
    }
  }, [purchasePrice, conversionFactor, form]);


  useEffect(() => {
    const commonReset = {
      materialCode: '',
      name: '',
      category: '',
      quantity: 0,
      unit: '',
      purchaseUnit: '',
      conversionFactor: 1,
      parLevel: 0,
      supplierId: '',
      purchasePrice: 0,
      unitCost: 0,
      allergens: [],
    };
  
    if (open) {
      if (mode === 'edit' && item) {
        form.reset({
          ...commonReset,
          ...item,
          supplierId: item.supplierId || '',
          allergens: item.allergens || [],
        });
      } else if (isInternalCreation) {
        form.reset({
          ...commonReset,
          category: 'Meat', // Default category for butchered items
          unit: 'kg', // Default unit for butchered items
          purchaseUnit: 'Butchery',
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
        const dataToSave = {
            ...values,
            // Set a default unit if not provided, for background calculations
            unit: values.unit || (values.category === 'Beverages' ? 'ml' : 'g')
        }

        if (mode === 'edit' && item) {
            await editInventoryItem(item.id, dataToSave);
             toast({
                title: 'Ingredient Updated',
                description: `"${values.name}" has been updated.`,
            });
            onClose();
        } else {
            const newItem = await addInventoryItem(dataToSave);
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
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${mode === 'add' ? 'add' : 'update'} ingredient. Please try again.`,
      });
    } finally {
      setLoading(false);
    }
  }

  const allergenOptions = allergens.map(allergen => ({
    value: allergen.name,
    label: allergen.name,
  }));

  const formTitle = isInternalCreation ? 'Add New Yield Item' : (mode === 'add' ? 'Add New Ingredient' : 'Edit Ingredient');
  const formDescription = isInternalCreation ? 'Enter details for this new cut. The supplier will be set to "In-house" automatically.' : 'Enter the details of the new ingredient.';

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
                        <FormItem className="md:col-span-2">
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
                        <FormItem>
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

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <FormField
                        control={form.control}
                        name="purchaseUnit"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Presentation</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isInternalCreation}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="e.g., Case, Box, 5L Can" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {purchaseUnits.map(unit => (
                                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
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
                            <FormItem>
                            <FormLabel>Presentation Cost</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" placeholder="e.g., 24.99" {...field} value={field.value || ''} disabled={isInternalCreation} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
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
                            <FormDescription className='text-xs'>Re-order point in base units (g, ml, or each)</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    {/* Hidden but required field for conversion */}
                    <FormField
                        control={form.control}
                        name="conversionFactor"
                        render={({ field }) => (
                            <FormItem className="hidden">
                            <FormLabel>Conversion Factor</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
                            </FormControl>
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
    </>
  );
}
