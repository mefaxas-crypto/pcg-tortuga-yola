
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
import type { ButcheringLog } from '@/lib/types';
import {
  collection,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { UndoButcheringLogDialog } from './UndoButcheringLogDialog';
import { useOutletContext } from '@/context/OutletContext';
import { useCollection, useFirebase } from '@/firebase';
import { useMemo } from 'react';

export function ButcheringLogHistory() {
  const { firestore } = useFirebase();
  const { selectedOutlet } = useOutletContext();
  
  const logsQuery = useMemo(() => {
      if (!firestore || !selectedOutlet) return null;
      return query(
        collection(firestore, 'butcheringLogs'),
        where('outletId', '==', selectedOutlet.id),
        orderBy('logDate', 'desc'),
        limit(20)
      );
    }, [firestore, selectedOutlet]);
  const { data: logs, isLoading: loading } = useCollection<ButcheringLog>(logsQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Butchering History</CardTitle>
        <CardDescription>
          A log of the most recent butchering events for the selected outlet. You can undo a log to reverse the inventory changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead className='hidden md:table-cell'>Date</TableHead>
                <TableHead>Primary Item Used</TableHead>
                <TableHead>Yielded Items</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className='hidden md:table-cell'>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-10 w-48" />
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
                     <TableCell className="align-top font-medium pt-3.5">
                      <div>{log.primaryItem.quantityUsed.toFixed(2)} {log.primaryItem.unit} of {log.primaryItem.itemName}</div>
                       <div className="text-xs text-muted-foreground md:hidden pt-1">
                        {log.logDate ? format(log.logDate, 'P p') : 'Processing...'} by {log.user}
                      </div>
                    </TableCell>
                    <TableCell colSpan={1} className='p-0 align-top'>
                      <div className='divide-y'>
                      {log.yieldedItems.map((item, index) => (
                        <div key={index} className='flex flex-col py-2 px-4'>
                          <span className="font-medium">{item.itemName}</span>
                           <span className="text-xs text-muted-foreground">
                            + {item.quantityYielded.toFixed(2)} {item.unit}
                          </span>
                        </div>
                      ))}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle text-right">
                       <UndoButcheringLogDialog logId={log.id} logDate={log.logDate}>
                          <Button variant="outline" size="sm">
                            <RotateCcw className="mr-2 h-3 w-3" />
                            Undo
                          </Button>
                        </UndoButcheringLogDialog>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {!loading && (!logs || logs.length === 0) && (
            <div className="py-12 text-center text-muted-foreground">
              No butchering logged yet for this outlet.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
