
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
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export function RecentSales() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('saleDate', 'desc'), limit(15));
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
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
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
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
            </TableRow>
          ))}
          {!loading && sales?.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell className="font-medium">{sale.recipeName}</TableCell>
              <TableCell className="text-muted-foreground">{sale.menuName}</TableCell>
              <TableCell className="text-center">{sale.quantity}</TableCell>
              <TableCell className="text-right text-green-600">{formatCurrency(sale.totalRevenue)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{format(sale.saleDate, 'p')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {!loading && sales?.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No sales logged yet.
          </div>
        )}
    </div>
  );
}
