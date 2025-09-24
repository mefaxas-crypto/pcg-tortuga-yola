
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { transferInventory } from '@/lib/actions';
import { db } from '@/lib/firebase';
import type { InventoryItem, InventoryStockItem } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Check, ChevronsUpDown, Send } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useOutletContext } from '@/context/OutletContext';

const formSchema = z.object({
  itemId: z.string().min(1, 'Please select an item to transfer.'),
  fromOutletId: z.string().min(1, 'Source outlet is required.'),
  toOutletId: z.string().min(1, 'Destination outlet is required.'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than zero.'),
  notes: z.string().optional(),
}).refine(data => data.fromOutletId !== data.toOutletId, {
    message: "Source and destination outlets cannot be the same.",
    path: ["toOutletId"],
});


export function TransferForm() {
  const [loading, setLoading] = useState(false);
  const { outlets } = useOutletContext();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stockLevels, setStockLevels] = useState<InventoryStockItem[]>([]);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemId: '',
      fromOutletId: '',
      toOutletId: '',
      quantity: 1,
      notes: '',
    },
  });

  const fromOutletId = form.watch('fromOutletId');
  const selectedItemId = form.watch('itemId');

  useEffect(() => {
    const invQuery = query(collection(db, 'inventory'));
    const unsubInv = onSnapshot(invQuery, (snapshot) => {
        const items: InventoryItem[] = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data()} as InventoryItem));
        setInventory(items.sort((a,b) => a.name.localeCompare(b.name)));
    });

    const stockQuery = query(collection(db, 'inventoryStock'));
    const unsubStock = onSnapshot(stockQuery, (snapshot) => {
        const stocks: InventoryStockItem[] = [];
        snapshot.forEach(doc => stocks.push({ id: doc.id, ...doc.data()} as InventoryStockItem));
        setStockLevels(stocks);
    });

    return () => {
        unsubInv();
        unsubStock();
    };
  }, []);

  const availableItemsToTransfer = useMemo(() => {
    if (!fromOutletId) return [];
    return inventory.filter(item => {
        const stock = stockLevels.find(s => s.inventoryId === item.id && s.outletId === fromOutletId);
        return stock && stock.quantity > 0;
    });
  }, [fromOutletId, inventory, stockLevels]);

  const selectedItemStock = useMemo(() => {
    if (!selectedItemId || !fromOutletId) return null;
    return stockLevels.find(s => s.inventoryId === selectedItemId && s.outletId === fromOutletId);
  }, [selectedItemId, fromOutletId, stockLevels]);

  const selectedItemSpec = useMemo(() => {
    if(!selectedItemId) return null;
    return inventory.find(i => i.id === selectedItemId);
  }, [selectedItemId, inventory]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
        await transferInventory(values);
        toast({
            title: 'Transfer Successful!',
            description: 'Inventory has been updated for both outlets.',
        });
        form.reset({ itemId: '', fromOutletId: '', toOutletId: '', quantity: 1, notes: '' });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({
            variant: 'destructive',
            title: 'Transfer Failed',
            description: errorMessage,
        });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>New Inventory Transfer</CardTitle>
            <CardDescription>Move stock from one outlet to another.</CardDescription>
        </CardHeader>
        <CardContent>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                     <FormField
                        control={form.control}
                        name="fromOutletId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>From Outlet</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select source outlet" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {outlets.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                    {o.name}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="toOutletId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>To Outlet</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select destination outlet" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {outlets.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                    {o.name}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="itemId"
                        render={({ field }) => (
                             <FormItem className="flex flex-col">
                                <FormLabel>Item to Transfer</FormLabel>
                                <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" role="combobox" disabled={!fromOutletId} className={cn('justify-between', !field.value && 'text-muted-foreground')}>
                                                {field.value ? availableItemsToTransfer.find(item => item.id === field.value)?.name : 'Select an item'}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search items..." />
                                            <CommandList>
                                                <CommandEmpty>No items with stock at source outlet.</CommandEmpty>
                                                <CommandGroup>
                                                    {availableItemsToTransfer.map((item) => (
                                                        <CommandItem value={item.name} key={item.id} onSelect={() => {
                                                            form.setValue('itemId', item.id);
                                                            setPopoverOpen(false);
                                                        }}>
                                                             <Check className={cn('mr-2 h-4 w-4', item.id === field.value ? 'opacity-100' : 'opacity-0')} />
                                                            {item.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {selectedItemStock && (
                                    <FormDescription>
                                        Available at source: {selectedItemStock.quantity.toFixed(2)} {selectedItemSpec?.unit}
                                    </FormDescription>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Quantity to Transfer</FormLabel>
                                <FormControl>
                                    <Input type="number" step="any" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="e.g., For weekend special" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Processing..." : "Submit Transfer"}
                        <Send className="ml-2" />
                    </Button>
                </form>
             </Form>
        </CardContent>
    </Card>
  );
}
