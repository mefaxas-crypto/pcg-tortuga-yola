
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
import type { InventoryItem, Supplier, InventoryStockItem } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
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
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';

const poItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  materialCode: z.string(),
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
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [loading, setLoading] = useState(false);
  const { selectedOutlet } = useOutletContext();
  
  const suppliersQuery = useMemoFirebase(() => query(collection(firestore, 'suppliers')), [firestore]);
  const { data: suppliersData } = useCollection<Supplier>(suppliersQuery);
  const suppliers = (suppliersData || []).sort((a,b) => a.name.localeCompare(b.name));

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
    if (!supplierId || !selectedOutlet) {
      replace([]);
      return;
    }

    const fetchItems = async () => {
      const q = query(
        collection(firestore, 'inventory'),
        where('supplierId', '==', supplierId)
      );

      const invSnapshot = await getDocs(q);
      const inventorySpecs = invSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      
      if (inventorySpecs.length === 0) {
        replace([]);
        return;
      }

      const inventoryIds = inventorySpecs.map(item => item.id);
      if (inventoryIds.length === 0) {
        replace([]);
        return;
      }

      const stockQuery = query(
        collection(firestore, 'inventoryStock'),
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
          materialCode: item.materialCode,
          purchaseUnit: item.purchaseUnit,
          purchasePrice: item.purchasePrice,
          onHand: onHandQty,
          minStock: item.minStock,
          maxStock: item.maxStock,
          orderQuantity: Math.max(0, suggestedQuantity),
        };
      });

      replace(poItems.sort((a,b) => a.name.localeCompare(b.name)));
    };

    fetchItems();
  }, [supplierId, selectedOutlet, replace, firestore]);


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

    try {
        await addPurchaseOrder({
            supplierId: supplier.id,
            supplierName: supplier.name,
            items: values.items,
            status: 'Pending',
        }, selectedOutlet.id);
        toast({ title: "Purchase Order Created!", description: `PO for ${supplier.name} has been saved.` });
        form.reset({ supplierId: '', items: [] });
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({ variant: 'destructive', title: 'Error', description: errorMessage });
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
                      <TableHead className='text-right hidden sm:table-cell'>On Hand</TableHead>
                      <TableHead className='text-right hidden md:table-cell'>Min</TableHead>
                       <TableHead className='text-right hidden md:table-cell'>Max</TableHead>
                      <TableHead className="w-[150px]">Order Qty</TableHead>
                      <TableHead className="w-[50px]"><span className="sr-only">Remove</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className='text-xs text-muted-foreground sm:hidden'>On Hand: {item.onHand.toFixed(2)} {item.purchaseUnit}</div>
                        </TableCell>
                        <TableCell className='text-right hidden sm:table-cell'>{item.onHand.toFixed(2)} {item.purchaseUnit}</TableCell>
                        <TableCell className='text-right hidden md:table-cell'>{item.minStock} {item.purchaseUnit}</TableCell>
                        <TableCell className='text-right hidden md:table-cell'>{item.maxStock} {item.purchaseUnit}</TableCell>
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
