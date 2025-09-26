
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/lib/firebase';
import type { InventoryTransfer } from '@/lib/types';
import { collection, onSnapshot, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight } from 'lucide-react';
import { useOutletContext } from '@/context/OutletContext';

export function TransferHistory() {
  const [transfers, setTransfers] = useState<InventoryTransfer[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { selectedOutlet } = useOutletContext();

  useEffect(() => {
    if (!selectedOutlet) {
      setTransfers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'inventoryTransfers'), orderBy('transferDate', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: InventoryTransfer[] = [];
      snapshot.forEach(doc => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          ...docData,
          transferDate: (docData.transferDate as Timestamp)?.toDate(),
        } as InventoryTransfer);
      });
      setTransfers(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transfer history:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedOutlet]);

  return (
     <Card>
        <CardHeader>
            <CardTitle>Transfer History</CardTitle>
            <CardDescription>A log of the most recent inventory transfers.</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-96">
                <Table>
                    <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Transfer Details</TableHead>
                            <TableHead className='text-right'>Quantity</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                        {!loading && transfers?.map(t => (
                            <TableRow key={t.id}>
                                <TableCell>
                                    <div className='font-medium'>{t.itemName}</div>
                                    <div className='text-xs text-muted-foreground'>{t.transferDate ? format(t.transferDate, 'P p') : 'N/A'}</div>
                                </TableCell>
                                 <TableCell>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="font-medium">{t.fromOutletName}</span>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{t.toOutletName}</span>
                                    </div>
                                    <div className='text-xs text-muted-foreground'>by {t.user}</div>
                                </TableCell>
                                <TableCell className="text-right font-medium">{t.quantity} {t.unit}</TableCell>
                            </TableRow>
                        ))}
                         {!loading && (!transfers || transfers.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                No transfers recorded yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </CardContent>
    </Card>
  )
}
