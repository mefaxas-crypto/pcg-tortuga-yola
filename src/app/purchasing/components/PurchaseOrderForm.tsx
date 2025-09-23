
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '@/lib/firebase';
import type { InventoryItem, Supplier, InventoryStockItem } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Save, Trash2 } from 'lucide-react';
import { addPurchaseOrder } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useOutletContext } from '@/context/OutletContext';

const poItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  purchaseUnit: z.string(),
  purchasePrice: z.number(),
  onHand: z.number(),
  minStock: z.number(),
  maxStock: z.number(),
  orderQuantity: z.coerce.number().min(0),
});

const formSchema = z.object({
  supplierId: z.string().min(1, 'Please select a supplier.'),
  items: z.array(poItemSchema),
});

export function PurchaseOrderForm() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { selectedOutlet } = useOutletContext();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: '',
      items: [],
    },
  });

  const { fields, replace, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const supplierId = form.watch('supplierId');

  useEffect(() => {
    const q = query(collection(db, 'suppliers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sup: Supplier[] = [];
      snapshot.forEach((doc) => sup.push({ id: doc.id, ...doc.data() } as Supplier));
      setSuppliers(sup.sort((a,b) => a.name.localeCompare(b.name)));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!supplierId || !selectedOutlet) {
      replace([]);
      return;
    }

    const q = query(
      collection(db, 'inventory'),
      where('supplierId', '==', supplierId)
    );

    const unsubscribe = onSnapshot(q, async (invSnapshot) => {
      const inventorySpecs = invSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      
      if (inventorySpecs.length === 0) {
        replace([]);
        return;
      }

      const inventoryIds = inventorySpecs.map(item => item.id);
      const stockQuery = query(
        collection(db, 'inventoryStock'),
        where('outletId', '==', selectedOutlet.id),
        where('inventoryId', 'in', inventoryIds)
      );

      const stockSnapshot = await getDocs(stockQuery);
      const stockLevels = new Map(stockSnapshot.docs.map(doc => [doc.data().inventoryId, doc.data() as InventoryStockItem]));

      const poItems = inventorySpecs.map(item => {
        const stock = stockLevels.get(item.id);
        const onHandQty = stock?.quantity ?? 0;
        
        const suggestedQuantity = onHandQty <= item.minStock
          ? Math.ceil(item.maxStock - onHandQty)
          : 0;
          
        return {
          itemId: item.id,
          name: item.name,
          purchaseUnit: item.purchaseUnit,
          purchasePrice: item.purchasePrice,
          onHand: onHandQty,
          minStock: item.minStock,
          maxStock: item.maxStock,
          orderQuantity: Math.max(0, suggestedQuantity),
        };
      });

      replace(poItems.sort((a,b) => a.name.localeCompare(b.name)));
    });

    return () => unsubscribe();
  }, [supplierId, selectedOutlet, replace]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!selectedOutlet) {
        toast({ variant: 'destructive', title: "No Outlet Selected", description: "Please select an outlet before creating a purchase order." });
        return;
    }
    setLoading(true);
    const supplier = suppliers.find(s => s.id === values.supplierId);
    if (!supplier) {
        toast({ variant: 'destructive', title: "Supplier not found."});
        setLoading(false);
        return;
    }

    const itemsToOrder = values.items.filter(item => item.orderQuantity > 0);
    if (itemsToOrder.length === 0) {
        toast({ variant: 'destructive', title: "No items to order.", description: "Please enter a quantity for at least one item."});
        setLoading(false);
        return;
    }

    try {
        await addPurchaseOrder({
            supplierId: supplier.id,
            supplierName: supplier.name,
            items: itemsToOrder,
            status: 'Pending',
        }, selectedOutlet.id);
        toast({ title: "Purchase Order Created!", description: `PO for ${supplier.name} has been saved.` });
        form.reset({ supplierId: '', items: [] });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create purchase order.' });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Purchase Order</CardTitle>
        <CardDescription>
          Select a supplier to see their items and create a new purchase order for the selected outlet. Quantities are suggested based on your Min/Max levels.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem className="max-w-sm">
                  <FormLabel>Supplier</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedOutlet}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!selectedOutlet ? "Select an outlet first" : "Select a supplier"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {supplierId && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className='text-right'>On Hand</TableHead>
                      <TableHead className='text-right'>Min Stock</TableHead>
                       <TableHead className='text-right'>Max Stock</TableHead>
                      <TableHead className="w-[150px]">Order Quantity</TableHead>
                      <TableHead className="w-[50px]"><span className="sr-only">Remove</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className='text-right'>{item.onHand.toFixed(2)} {item.purchaseUnit}</TableCell>
                        <TableCell className='text-right'>{item.minStock} {item.purchaseUnit}</TableCell>
                        <TableCell className='text-right'>{item.maxStock} {item.purchaseUnit}</TableCell>
                        <TableCell>
                           <FormField
                                control={form.control}
                                name={`items.${index}.orderQuantity`}
                                render={({ field }) => <Input type="number" {...field} />}
                            />
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {fields.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                                No items found for this supplier.
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            
            <div className="flex justify-end">
                <Button type="submit" disabled={loading || !supplierId || fields.length === 0}>
                    {loading ? 'Saving...' : 'Create Purchase Order'}
                    <Save className="ml-2 h-4 w-4" />
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
