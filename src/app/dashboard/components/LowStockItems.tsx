
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
import { db } from '@/lib/firebase';
import type { InventoryItem, InventoryStockItem } from '@/lib/types';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from '@/context/OutletContext';
import { Skeleton } from '@/components/ui/skeleton';

type LowStockItemsProps = {
    showTable?: boolean;
}

export function LowStockItems({ showTable = false }: LowStockItemsProps) {
  const { selectedOutlet } = useOutletContext();
  const [lowStockItemSpecs, setLowStockItemSpecs] = useState<InventoryItem[] | null>(null);
  const [lowStockLevels, setLowStockLevels] = useState<InventoryStockItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedOutlet) {
        setLowStockItemSpecs([]);
        setLowStockLevels([]);
        setLoading(false);
        return;
    }
    setLoading(true);

    const stockQuery = query(
      collection(db, 'inventoryStock'),
      where('outletId', '==', selectedOutlet.id),
      where('status', 'in', ['Low Stock', 'Out of Stock'])
    );

    const unsubscribe = onSnapshot(
      stockQuery,
      (stockSnapshot) => {
        const stockLevels: InventoryStockItem[] = [];
        stockSnapshot.forEach((doc) => {
          stockLevels.push({ id: doc.id, ...doc.data() } as InventoryStockItem);
        });
        setLowStockLevels(stockLevels);

        if (stockLevels.length > 0) {
            const specIds = stockLevels.map(s => s.inventoryId);
            // Firestore 'in' queries fail with an empty array.
            if (specIds.length === 0) {
              setLowStockItemSpecs([]);
              setLoading(false);
              return;
            }
            const specQuery = query(collection(db, 'inventory'), where('__name__', 'in', specIds));
            onSnapshot(specQuery, (specSnapshot) => {
                const specs: InventoryItem[] = [];
                specSnapshot.forEach((doc) => {
                    specs.push({ id: doc.id, ...doc.data() } as InventoryItem);
                });
                setLowStockItemSpecs(specs);
                setLoading(false);
            });
        } else {
            setLowStockItemSpecs([]);
            setLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching low stock items:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedOutlet]);

  const combinedItems = useMemo(() => {
    if (!lowStockItemSpecs || !lowStockLevels) return [];
    
    return lowStockLevels.map(stock => {
      const spec = lowStockItemSpecs.find(s => s.id === stock.inventoryId);
      return {
        ...spec,
        ...stock,
      } as InventoryItem & InventoryStockItem;
    }).sort((a,b) => a.name.localeCompare(b.name));
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
                        <TableCell className='text-right'>{item.quantity.toFixed(2)} {item.unit}</TableCell>
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
