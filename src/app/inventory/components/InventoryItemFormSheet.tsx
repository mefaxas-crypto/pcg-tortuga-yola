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
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { addInventoryItem } from '@/lib/actions';
import { useEffect, useState } from 'react';
import type { Supplier } from '@/lib/types';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  materialCode: z.string().min(1, 'Material Code is required.'),
  name: z.string().min(2, 'Ingredient name must be at least 2 characters.'),
  category: z.string().min(1, 'Category is required.'),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative.'),
  unit: z.string().min(1, 'Unit is required.'),
  purchaseUnit: z.string().min(1, 'Purchase Unit is required.'),
  parLevel: z.coerce.number().min(0, 'Par level cannot be negative.'),
  supplier: z.string().min(1, 'Supplier is required.'),
  allergens: z.string().optional(),
});

type InventoryItemFormSheetProps = {
  open: boolean;
  onClose: () => void;
};

// Placeholder data - we can build a management UI for these later
const categories = ['Produce', 'Meat', 'Dairy', 'Dry Goods', 'Beverages', 'Other'];
const purchaseUnits = ['Case', 'Box', 'Bottle', 'Bag', 'Each', 'Unit'];
const recipeUnits = ['kg', 'g', 'L', 'mL', 'unit'];

export function InventoryItemFormSheet({
  open,
  onClose,
}: InventoryItemFormSheetProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
      parLevel: 0,
      supplier: '',
      allergens: '',
    },
  });

  useEffect(() => {
    if (open) {
        const q = query(collection(db, 'suppliers'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const suppliersData: Supplier[] = [];
          querySnapshot.forEach((doc) => {
            suppliersData.push({ id: doc.id, ...doc.data() } as Supplier);
          });
          setSuppliers(suppliersData.sort((a, b) => a.name.localeCompare(b.name)));
        });
    
        return () => unsubscribe();
    }
  }, [open]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
        await addInventoryItem(values);
        toast({
            title: 'Ingredient Added',
            description: `"${values.name}" has been added to your inventory.`,
        });
      form.reset();
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to add ingredient. Please try again.`,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
            form.reset();
            onClose();
        }
    }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add a New Ingredient</SheetTitle>
          <SheetDescription>
            Enter the details of the new ingredient to normalize it for your kitchen.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                        <Input type="number" {...field} />
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
                       <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a unit" />
                          </Trigger>
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
             <FormField
                control={form.control}
                name="purchaseUnit"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Purchase Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a purchase unit" />
                        </Trigger>
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
              name="parLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Par Level</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supplier" />
                      </Trigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.name}>{supplier.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="allergens"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allergens</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Gluten, Nuts" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => {
                  form.reset();
                  onClose();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Ingredient'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
