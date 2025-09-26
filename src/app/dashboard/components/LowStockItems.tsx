
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
import { query, where } from 'firebase/firestore';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase } from '@/firebase';
import { collections } from '@/firebase/firestore/collections';

type LowStockItemsProps = {
    showTable?: boolean;
}

export function LowStockItems({ showTable = false }: LowStockItemsProps) {
  const { firestore } = useFirebase();
  
  const lowStockLevelsQuery = useMemo(() => firestore ? query(
      collections.inventoryStock(firestore),
      where('status', 'in', ['Low Stock', 'Out of Stock'])
    ) : null, [firestore]);
  const { data: lowStockLevels, isLoading: stockLoading } = useCollection(lowStockLevelsQuery);

  const lowStockItemIds = useMemo(() => lowStockLevels?.map(s => s.inventoryId) || [], [lowStockLevels]);

  const lowStockItemSpecsQuery = useMemo(() => (firestore && lowStockItemIds.length > 0)
    ? query(collections.inventory(firestore), where('__name__', 'in', lowStockItemIds))
    : null, [firestore, lowStockItemIds]);
  const { data: lowStockItemSpecs, isLoading: specsLoading } = useCollection(lowStockItemSpecsQuery);

  const loading = stockLoading || specsLoading;

  const combinedItems = useMemo(() => {
    if (!lowStockItemSpecs || !lowStockLevels) return [] as (InventoryItem & InventoryStockItem)[];
    const merged: (InventoryItem & InventoryStockItem)[] = [];
    for (const stock of lowStockLevels) {
      const spec = lowStockItemSpecs.find(s => s.id === stock.inventoryId);
      if (!spec) continue;
      merged.push({ ...spec, ...stock });
    }
    return merged.sort((a, b) => a.name.localeCompare(b.name));
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
                {combinedItems.map(item => {
                  return (
                    <TableRow key={item.id}>
                      <TableCell className='font-medium'>{item.name}</TableCell>
                      <TableCell className='text-right'>{(item.quantity ?? 0).toFixed(2)} {item.purchaseUnit}</TableCell>
                    </TableRow>
                  );
                })}
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
