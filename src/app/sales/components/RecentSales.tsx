
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Sale } from '@/lib/types';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useOutletContext } from '@/context/OutletContext';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';

export function RecentSales() {
  const { firestore } = useFirebase();
  const { selectedOutlet } = useOutletContext();
  
  const salesQuery = useMemoFirebase(() => {
    if (!selectedOutlet) return null;
    return query(
      collection(firestore, 'sales'),
      where('outletId', '==', selectedOutlet.id),
      orderBy('saleDate', 'desc'),
      limit(15)
    );
  }, [firestore, selectedOutlet]);
  const { data: sales, isLoading: loading } = useCollection<Sale>(salesQuery);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  }
  
  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center p-2">
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!sales || sales.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          No sales logged yet for this outlet.
        </div>
      );
  }

  return (
    <div className="relative w-full overflow-auto h-96">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Menu</TableHead>
            <TableHead className="text-center">Qty</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell className="font-medium">{sale.recipeName}</TableCell>
              <TableCell className="text-muted-foreground">{sale.menuName}</TableCell>
              <TableCell className="text-center">{sale.quantity}</TableCell>
              <TableCell className="text-right text-green-600">{formatCurrency(sale.totalRevenue)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{sale.saleDate ? format(sale.saleDate, 'p') : 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
