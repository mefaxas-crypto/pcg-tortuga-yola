
'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PurchaseOrdersTable() {
    const loading = true; // For now, we will just show the skeleton

    return (
        <Card>
            <CardHeader>
                <CardTitle>Existing Purchase Orders</CardTitle>
                <CardDescription>
                    A list of all your pending and completed purchase orders. Receiving functionality coming soon.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="relative w-full overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PO Number</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total Items</TableHead>
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
                                </TableRow>
                            ))}
                            {!loading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                                        No purchase orders found.
                                    </TableCell>
                                </TableRow>
                            )}
                         </TableBody>
                    </Table>
                 </div>
            </CardContent>
        </Card>
    );
}
