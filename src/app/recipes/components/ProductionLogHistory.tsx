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
          A log of the most recently produced sub-recipes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <Table>
            <TableHeader className='sticky top-0 bg-card'>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Item Produced</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
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
                  </TableRow>
                ))}
              {!loading &&
                logs?.map((log) =>
                  log.producedItems.map((item, index) => (
                    <TableRow key={`${log.id}-${index}`}>
                      {index === 0 && (
                        <>
                          <TableCell
                            className="align-top text-muted-foreground"
                            rowSpan={log.producedItems.length}
                          >
                            {format(log.logDate, 'P p')}
                          </TableCell>
                          <TableCell
                            className="align-top text-muted-foreground"
                            rowSpan={log.producedItems.length}
                          >
                            {log.user}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="font-medium">
                        {item.recipeName}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantityProduced} {item.yieldUnit}
                      </TableCell>
                    </TableRow>
                  ))
                )}
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
