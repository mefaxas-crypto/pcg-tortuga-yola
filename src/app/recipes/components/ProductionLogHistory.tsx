
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
import type { ProductionLog } from '@/lib/types';
import {
  collection,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { UndoProductionLogDialog } from './UndoProductionLogDialog';
import { useCollection, useFirebase } from '@/firebase';
import { useMemo } from 'react';

export function ProductionLogHistory() {
  const { firestore } = useFirebase();
  
  const logsQuery = useMemo(() => {
      if (!firestore) return null;
      return query(
        collection(firestore, 'productionLogs'),
        orderBy('logDate', 'desc'),
        limit(20)
      );
    }, [firestore]);
  const { data: logs, isLoading: loading } = useCollection<ProductionLog>(logsQuery);

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
                <TableHead className='hidden md:table-cell'>Date</TableHead>
                <TableHead>Item(s) Produced</TableHead>
                <TableHead className="text-right">Total Produced</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className='hidden md:table-cell'>
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
                    <TableCell className="align-top text-muted-foreground pt-3.5 hidden md:table-cell">
                      {log.logDate ? format(log.logDate, 'P p') : 'Processing...'}
                    </TableCell>
                    <TableCell colSpan={1} className='p-0 align-top'>
                      <div className='divide-y'>
                      {log.producedItems.map((item, index) => (
                        <div key={index} className='flex flex-col py-2 px-4'>
                          <span className="font-medium">{item.recipeName}</span>
                           <span className="text-xs text-muted-foreground">
                            {item.quantityProduced} x {item.yieldPerBatch} {item.yieldUnit}
                          </span>
                           <div className="text-xs text-muted-foreground md:hidden pt-1">
                             {log.logDate ? format(log.logDate, 'P p') : 'Processing...'} by {log.user}
                          </div>
                        </div>
                      ))}
                      </div>
                    </TableCell>
                     <TableCell className='p-0 align-top'>
                        <div className='divide-y'>
                             {log.producedItems.map((item, index) => (
                                <div key={index} className='flex justify-end items-center py-2 px-4 h-[77px] md:h-[61px]'>
                                    <span className="text-right font-medium">
                                        {(item.quantityProduced * item.yieldPerBatch).toFixed(2)} {item.yieldUnit}
                                    </span>
                                </div>
                            ))}
                        </div>
                     </TableCell>
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
