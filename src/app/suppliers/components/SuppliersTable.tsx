
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FilePenLine, MoreVertical, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Supplier } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteSupplierDialog } from './DeleteSupplierDialog';
import { useCollection, useFirebase } from '@/firebase';
import { useMemo } from 'react';

type SuppliersTableProps = {
  onEdit: (supplier: Supplier) => void;
};

export function SuppliersTable({ onEdit }: SuppliersTableProps) {
  const { firestore } = useFirebase();
  const suppliersQuery = useMemo(() => firestore ? query(collection(firestore, 'suppliers'), orderBy('name', 'asc')) : null, [firestore]);
  const { data: suppliers, isLoading: loading } = useCollection<Supplier>(suppliersQuery);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className='hidden md:table-cell'>Contact Person</TableHead>
                <TableHead className='hidden sm:table-cell'>Phone Number</TableHead>
                <TableHead className='hidden md:table-cell'>Email</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell className='hidden md:table-cell'>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell className='hidden sm:table-cell'>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell className='hidden md:table-cell'>
                      <Skeleton className="h-5 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!loading &&
                suppliers?.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-xs text-muted-foreground md:hidden">{supplier.contactPerson}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{supplier.phoneNumber}</div>
                    </TableCell>
                    <TableCell className='hidden md:table-cell'>{supplier.contactPerson}</TableCell>
                    <TableCell className='hidden sm:table-cell'>{supplier.phoneNumber}</TableCell>
                    <TableCell className='hidden md:table-cell'>{supplier.email}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(supplier)}>
                            <FilePenLine className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DeleteSupplierDialog
                            supplierId={supplier.id}
                            supplierName={supplier.name}
                          >
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive-foreground focus:text-destructive-foreground focus:bg-destructive/90"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DeleteSupplierDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {!loading && suppliers?.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No suppliers found. Add your first one!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
