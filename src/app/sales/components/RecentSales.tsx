
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { db } from '@/lib/firebase';
import type { Sale } from '@/lib/types';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useOutletContext } from '@/context/OutletContext';

export function RecentSales() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { selectedOutlet } = useOutletContext();

  useEffect(() => {
    if (!selectedOutlet) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const q = query(
      collection(db, 'sales'),
      where('outletId', '==', selectedOutlet.id),
      orderBy('saleDate', 'desc'),
      limit(15)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const salesData: Sale[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        salesData.push({ 
          id: doc.id, 
          ...data,
          saleDate: data.saleDate?.toDate(), // Convert Firestore Timestamp to JS Date
        } as Sale);
      });
      setSales(salesData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching recent sales: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedOutlet]);

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
