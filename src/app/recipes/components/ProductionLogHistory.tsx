'use client';

import {
  Card,
  CardContent,
  CardDescription,
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
import type { ProductionLog } from '@/lib/types';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { UndoProductionLogDialog } from './UndoProductionLogDialog';

export function ProductionLogHistory() {
  const [logs, setLogs] = useState<ProductionLog[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'productionLogs'),
      orderBy('logDate', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const logsData: ProductionLog[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          logsData.push({
            id: doc.id,
            ...data,
            logDate: data.logDate?.toDate(), // Convert Firestore Timestamp to JS Date
          } as ProductionLog);
        });
        setLogs(logsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching production logs: ', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Production History</CardTitle>
        <CardDescription>
          A log of the most recently produced sub-recipes. You can undo a log to reverse the inventory changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Item Produced</TableHead>
                <TableHead className="text-right">Batches</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 ml-auto" />
                    </TableCell>
                     <TableCell>
                      <Skeleton className="h-8 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              {!loading &&
                logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="align-top text-muted-foreground pt-3.5">
                      {log.logDate ? format(log.logDate, 'P p') : 'Processing...'}
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground pt-3.5">
                      {log.user}
                    </TableCell>
                    <TableCell colSpan={1} className='p-0'>
                      <div className='divide-y'>
                      {log.producedItems.map((item, index) => (
                        <div key={index} className='flex justify-between items-center py-2 px-4'>
                          <span className="font-medium">{item.recipeName}</span>
                          <span className="text-right text-muted-foreground">
                            {item.quantityProduced.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      </div>
                    </TableCell>
                     <TableCell colSpan={0} className='p-0'></TableCell>
                    <TableCell className="align-middle text-right">
                       <UndoProductionLogDialog logId={log.id} logDate={log.logDate}>
                          <Button variant="outline" size="sm">
                            <RotateCcw className="mr-2 h-3 w-3" />
                            Undo
                          </Button>
                        </UndoProductionLogDialog>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {!loading && (!logs || logs.length === 0) && (
            <div className="py-12 text-center text-muted-foreground">
              No production logged yet.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
