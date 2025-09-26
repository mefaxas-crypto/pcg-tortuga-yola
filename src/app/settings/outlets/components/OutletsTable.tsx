
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
import type { Outlet } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteOutletDialog } from './DeleteOutletDialog';
import { useCollection, useFirebase } from '@/firebase';
import { useMemo } from 'react';


type OutletsTableProps = {
  onEdit: (outlet: Outlet) => void;
};

export function OutletsTable({ onEdit }: OutletsTableProps) {
  const { firestore } = useFirebase();

  const outletsQuery = useMemo(() =>
      firestore
        ? query(
            collection(firestore, 'outlets'),
            orderBy('name', 'asc')
          )
        : null, [firestore]);

  const { data: outlets, isLoading: loading } = useCollection<Outlet>(outletsQuery);


  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Outlet Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 2 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              {!loading &&
                outlets?.map((outlet) => (
                  <TableRow key={outlet.id}>
                    <TableCell className="font-medium">
                      {outlet.name}
                    </TableCell>
                    <TableCell>{outlet.address}</TableCell>
                    <TableCell className="text-right">
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
                          <DropdownMenuItem onClick={() => onEdit(outlet)}>
                            <FilePenLine className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DeleteOutletDialog
                            outletId={outlet.id}
                            outletName={outlet.name}
                          >
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DeleteOutletDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {!loading && outlets?.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No outlets found. Add your first one!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
