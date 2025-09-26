
'use client';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOutletContext } from '@/context/OutletContext';
import { useDoc, useFirebase } from '@/firebase';
import type { PurchaseOrder } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Printer, ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useMemo } from 'react';

export default function PurchaseOrderPage() {
  const router = useRouter();
  const params = useParams();
  const { firestore } = useFirebase();
  const id = params.id as string;
  const poRef = useMemo(() => firestore ? doc(firestore, 'purchaseOrders', id) : null, [firestore, id]);
  const { data: po, isLoading: loading } = useDoc<PurchaseOrder>(poRef);
  const { selectedOutlet } = useOutletContext();
  
  const totalCost = po?.items.reduce((sum, item) => sum + (item.orderQuantity * item.purchasePrice), 0) || 0;
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!po) {
    return <div className='py-12 text-center'>Purchase Order not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Requisition: ${po.poNumber}`}>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to POs
            </Button>
            <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print Requisition
            </Button>
        </div>
      </PageHeader>
      <Card className="print:shadow-none print:border-none">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold">
                Purchase Requisition
              </CardTitle>
              <CardDescription>PO Number: {po.poNumber}</CardDescription>
            </div>
            <div className="text-right">
                <p className='font-semibold'>{selectedOutlet?.name}</p>
                <p className='text-sm text-muted-foreground'>{selectedOutlet?.address}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div>
                    <h3 className="font-semibold mb-2">Vendor</h3>
                    <div className="text-muted-foreground">
                        <p>{po.supplierName}</p>
                    </div>
                </div>
                 <div className='text-right'>
                    <h3 className="font-semibold mb-2">Details</h3>
                    <div className="text-muted-foreground">
                        <p>Date: {po.createdAt ? format(po.createdAt, 'PPP p') : 'N/A'}</p>
                        <p>Status: <span className='font-medium'>{po.status}</span></p>
                    </div>
                </div>
                <div className='text-right'>
                    <h3 className="font-semibold mb-2">Requested By</h3>
                    <div className="text-muted-foreground">
                        <p>{po.user || 'N/A'}</p>
                    </div>
                </div>
            </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[100px]'>Item Code</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item) => (
                <TableRow key={item.itemId}>
                  <TableCell className='text-muted-foreground'>{item.materialCode}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">
                    {item.orderQuantity}
                  </TableCell>
                  <TableCell className="text-right">{item.purchaseUnit}</TableCell>
                   <TableCell className="text-right">{formatCurrency(item.purchasePrice)}</TableCell>
                   <TableCell className="text-right font-medium">{formatCurrency(item.orderQuantity * item.purchasePrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           <div className="mt-4 flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between font-semibold text-lg">
                        <span>Grand Total</span>
                        <span>{formatCurrency(totalCost)}</span>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
