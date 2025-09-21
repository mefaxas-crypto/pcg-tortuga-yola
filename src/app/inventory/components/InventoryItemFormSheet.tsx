

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

const formSchema = z.object({
  materialCode: z.string().min(1, 'Material Code is required.'),
  name: z.string().min(2, 'Ingredient name must be at least 2 characters.'),
  category: z.string().min(1, 'Category is required.'),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative.'),
  unit: z.string().min(1, 'Unit is required.'),
  purchaseUnit: z.string().min(1, 'Purchase Unit is required.'),
  conversionFactor: z.coerce.number().min(0.0001, 'Conversion factor must be positive.'),
  parLevel: z.coerce.number().min(0, 'Par level cannot be negative.'),
  supplierId: z.string().optional(),
  purchasePrice: z.coerce.number().min(0, 'Purchase price must be a positive number.'),
  unitCost: z.coerce.number().min(0, 'Unit cost must be a positive number.'),
  allergens: z.array(z.string()).optional(),
});

type InventoryItemFormSheetProps = {
  open: boolean;
  mode: 'add' | 'edit';
  item?: InventoryItem;
  onClose: () => void;
  onItemCreated?: (newItem: InventoryItem) => void;
};

// --- Standardized Unit Definitions ---

// Categories help group units logically in dropdowns
const categories = ['Produce', 'Meat', 'Dairy', 'Dry Goods', 'Beverages', 'Other'];

// Units for purchasing from suppliers
const purchaseUnits = [
    // Common Cases and Containers
    'Case', 'Box', 'Bottle', 'Bag', 'Jar', 'Can', 'Carton',
    // By Weight
    'kg', 'lb',
    // By Volume
    'l', 'gal',
    // Individual Items
    'Each', 'Unit', 'Pack',
    // Special
    'Butchery',
    'Production',
];

// Units for use in recipes and internal tracking
const recipeUnits = [
    // Weight
    'g', 'kg', 'oz', 'lb',
    // Volume
    'ml', 'l', 'floz', 'cup', 'tbsp', 'tsp',
    // Individual Items
    'unit', 'each', 'slice', 'portion'
];


export function InventoryItemFormSheet({
  open,
  mode,
  item,
  onClose,
  onItemCreated,
}: InventoryItemFormSheetProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const { toast } = useToast();
  
  // A flag to determine if the form is for a butchered/produced item.
  const isInternalCreation = !!onItemCreated;
  
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
    // Only auto-calculate unit cost for non-internal items
    if (!isInternalCreation && purchasePrice !== undefined && conversionFactor > 0) {
      const newUnitCost = purchasePrice / conversionFactor;
      form.setValue('unitCost', newUnitCost, { shouldValidate: true });
    }
  }, [purchasePrice, conversionFactor, form, isInternalCreation]);


  useEffect(() => {
    if (open) {
      if (mode === 'edit' && item) {
        form.reset({
          materialCode: item.materialCode || '',
          name: item.name || '',
          category: item.category || '',
          quantity: item.quantity || 0,
          unit: item.unit || '',
          purchaseUnit: item.purchaseUnit || '',
          conversionFactor: item.conversionFactor || 1,
          parLevel: item.parLevel || 0,
          supplierId: item.supplierId || '',
          purchasePrice: item.purchasePrice || 0,
          unitCost: item.unitCost || 0,
          allergens: item.allergens || [],
        });
      } else if (isInternalCreation) {
        // Defaults for butchering/production items
         form.reset({
          materialCode: '',
          name: '',
          category: 'Meat', // Default category for butchered items
          quantity: 0, // Starts with 0 quantity, will be updated by butchering log
          unit: 'kg', // Default unit for butchered items
          purchaseUnit: 'Butchery',
          conversionFactor: 1, // 1:1 since it's created internally
          parLevel: 0,
          supplierId: '', // No supplier needed, will default to 'In-house' on server
          purchasePrice: 0, // No direct purchase price
          unitCost: 0, // Cost is calculated during the butchering log
          allergens: [],
        });
      } else {
        // Standard "Add Ingredient" defaults
        form.reset({
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
        });
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
    }, (error) => {
      console.error("Failed to fetch suppliers:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load suppliers. Please try again later.',
      });
    });

    const qAllergens = query(collection(db, 'allergens'));
    const unsubscribeAllergens = onSnapshot(qAllergens, (querySnapshot) => {
      const allergensData: Allergen[] = [];
      querySnapshot.forEach((doc) => {
        allergensData.push({ id: doc.id, ...doc.data() } as Allergen);
      });
      setAllergens(allergensData.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      console.error("Failed to fetch allergens:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load allergens. Please try again later.',
      });
    });

    return () => {
      unsubscribeSuppliers();
      unsubscribeAllergens();
    };
  }, [toast]);
  
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
        if (mode === 'edit' && item) {
            await editInventoryItem(item.id, values);
             toast({
                title: 'Ingredient Updated',
                description: `"${values.name}" has been updated.`,
            });
            onClose();
        } else {
            const newItem = await addInventoryItem(values);
            toast({
                title: 'Ingredient Added',
                description: `"${values.name}" has been added to your inventory.`,
            });
            if(onItemCreated && newItem) {
                onItemCreated(newItem);
            } else {
                onClose();
            }
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

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <SheetContent className="overflow-y-auto">
        <Form {...form}>
          <SheetHeader>
            <SheetTitle>{isInternalCreation ? 'Add New Yield Item' : (mode === 'add' ? 'Add New Ingredient' : 'Edit Ingredient')}</SheetTitle>
            <SheetDescription>
              {isInternalCreation ? 'Enter details for this new cut. Cost will be calculated from the butchering log.' : (mode === 'add' ? 'Enter the details of the new ingredient.' : 'Update the details for this ingredient.')}
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
            <fieldset disabled={loading} className="grid gap-4">
              <FormField
                control={form.control}
                name="materialCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cod. Material (SAP Code)</FormLabel>
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
                    <FormLabel>Ingredient Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Extra Virgin Olive Oil 5L" {...field} />
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                          <Input type="number" {...field} value={field.value || ''} disabled={isInternalCreation} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipe Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isInternalCreation}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="e.g., g, ml" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {recipeUnits.map(unit => (
                              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              
            {!isInternalCreation && (
                <>
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="purchaseUnit"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Purchase Unit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="e.g., Case" />
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
                        <FormLabel>Purchase Price</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="e.g., 24.99" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="conversionFactor"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Conversion Factor</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.001" placeholder="e.g., 5000" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>How many recipe units are in one purchase unit?</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                
                <FormField
                    control={form.control}
                    name="unitCost"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Unit Cost (Auto-calculated)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.001" placeholder="e.g., 0.05" {...field} readOnly className="bg-muted/50" value={field.value || ''} />
                        </FormControl>
                        <FormDescription>The cost for one recipe unit (e.g., cost per gram).</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </>
            )}

              <FormField
                control={form.control}
                name="parLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Par Level</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value || ''} />
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
                        <FormLabel>Supplier</FormLabel>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              )}
              
              <FormField
                control={form.control}
                name="allergens"
                render={({ field }) => (
                  <FormItem>
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
            </fieldset>
            <SheetFooter className="mt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
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
