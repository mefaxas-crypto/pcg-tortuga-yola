
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import type { InventoryItem, InventoryStockItem } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { useOutletContext } from '@/context/OutletContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';

type LowStockItemsProps = {
    showTable?: boolean;
}

export function LowStockItems({ showTable = false }: LowStockItemsProps) {
  const { firestore } = useFirebase();
  const { selectedOutlet } = useOutletContext();
  
  const lowStockLevelsQuery = useMemoFirebase(() => {
    if (!selectedOutlet) return null;
    return query(
      collection(firestore, 'inventoryStock'),
      where('outletId', '==', selectedOutlet.id),
      where('status', 'in', ['Low Stock', 'Out of Stock'])
    );
  }, [firestore, selectedOutlet]);
  
  const { data: lowStockLevels, isLoading: stockLoading } = useCollection<InventoryStockItem>(lowStockLevelsQuery);

  const lowStockItemIds = useMemo(() => lowStockLevels?.map(s => s.inventoryId) || [], [lowStockLevels]);

  const lowStockItemSpecsQuery = useMemoFirebase(() => {
    if (!lowStockItemIds || lowStockItemIds.length === 0) return null;
    return query(collection(firestore, 'inventory'), where('__name__', 'in', lowStockItemIds));
  }, [firestore, lowStockItemIds]);

  const { data: lowStockItemSpecs, isLoading: specsLoading } = useCollection<InventoryItem>(lowStockItemSpecsQuery);

  const loading = stockLoading || specsLoading;

  const combinedItems = useMemo(() => {
    if (!lowStockItemSpecs || !lowStockLevels) return [];
    
    return lowStockLevels.map(stock => {
      const spec = lowStockItemSpecs.find(s => s.id === stock.inventoryId);
      if (!spec) return null; // If spec is not found, return null
      return {
        ...spec,
        ...stock,
      } as InventoryItem & InventoryStockItem;
    })
    .filter(Boolean) // Filter out the null values
    .sort((a,b) => a.name.localeCompare(b.name));
  }, [lowStockItemSpecs, lowStockLevels]);

  if (showTable) {
    if (loading) {
      return (
         <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
      );
    }
    if (combinedItems.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          All items are well-stocked!
        </div>
      );
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className='text-right'>Quantity</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {combinedItems.map(item => (
                    <TableRow key={item.id}>
                        <TableCell className='font-medium'>{item.name}</TableCell>
                        <TableCell className='text-right'>{item.quantity.toFixed(2)} {item.purchaseUnit}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
  }

  // Render stat card
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-7 w-8 mt-1" /> : (
            <div className="text-2xl font-bold">{combinedItems.length}</div>
        )}
        <Link href="/inventory">
          <p className="text-xs text-muted-foreground hover:underline">
              Items below minimum level
          </p>
        </Link>
      </CardContent>
    </Card>
  );
}
