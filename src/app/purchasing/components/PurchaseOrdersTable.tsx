
'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import type { PurchaseOrder } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Inbox, MoreVertical, XCircle } from 'lucide-react';
import { ReceivePoDialog } from './ReceivePoDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CancelPoDialog } from './CancelPoDialog';
import { useOutletContext } from '@/context/OutletContext';

type PurchaseOrdersTableProps = {
    status: 'active' | 'history';
}

const activeStatuses: PurchaseOrder['status'][] = ['Pending', 'Partially Received'];
const historyStatuses: PurchaseOrder['status'][] = ['Received', 'Cancelled'];

export function PurchaseOrdersTable({ status }: PurchaseOrdersTableProps) {
    const { selectedOutlet } = useOutletContext();
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

    useEffect(() => {
        if (!selectedOutlet) {
            setPurchaseOrders([]);
            setLoading(false);
            return;
        }
        setLoading(true);

        const statusesToQuery = status === 'active' ? activeStatuses : historyStatuses;
        const q = query(
            collection(db, 'purchaseOrders'), 
            where('outletId', '==', selectedOutlet.id),
            where('status', 'in', statusesToQuery),
            orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const pos: PurchaseOrder[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                pos.push({ 
                    id: doc.id, 
                    ...data,
                    createdAt: data.createdAt?.toDate() // convert Firestore Timestamp to JS Date
                } as PurchaseOrder);
            });
            setPurchaseOrders(pos);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching purchase orders: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [status, selectedOutlet]);

    const getStatusBadge = (status: PurchaseOrder['status']) => {
        switch (status) {
          case 'Pending':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200/80';
          case 'Partially Received':
            return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200/80';
          case 'Received':
            return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200/80';
          case 'Cancelled':
            return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200/80';
          default:
            return 'bg-secondary';
        }
    };
    
    const handleReceiveClick = (po: PurchaseOrder) => {
        setSelectedPo(po);
    };

    const handleDialogClose = () => {
        setSelectedPo(null);
    }

    return (
        <>
        <Card>
            <CardContent className='pt-6'>
                 <div className="relative w-full overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PO Number</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total Items</TableHead>
                                <TableHead className='w-[150px] text-right'><span className='sr-only'>Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {loading && Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                            {!loading && purchaseOrders?.map((po) => (
                                <TableRow key={po.id}>
                                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                                    <TableCell>{po.supplierName}</TableCell>
                                    <TableCell>{po.createdAt ? format(po.createdAt, 'P') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn('capitalize', getStatusBadge(po.status))}>
                                            {po.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{po.items.length}</TableCell>
                                    <TableCell className="text-right">
                                        {status === 'active' && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                        <span className='sr-only'>Actions</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleReceiveClick(po)}>
                                                        <Inbox className="mr-2 h-4 w-4" />
                                                        Receive
                                                    </DropdownMenuItem>
                                                    {po.status === 'Pending' && (
                                                        <CancelPoDialog poId={po.id} poNumber={po.poNumber}>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                <XCircle className="mr-2 h-4 w-4" />
                                                                Cancel
                                                            </DropdownMenuItem>
                                                        </CancelPoDialog>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && purchaseOrders?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                                        No purchase orders found in this view.
                                    </TableCell>
                                </TableRow>
                            )}
                         </TableBody>
                    </Table>
                 </div>
            </CardContent>
        </Card>
        
        {selectedPo && (
            <ReceivePoDialog 
                po={selectedPo}
                open={!!selectedPo}
                onClose={handleDialogClose}
            />
        )}
        </>
    );
}
