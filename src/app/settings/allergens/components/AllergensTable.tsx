
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
import { MoreVertical, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Allergen } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteAllergenDialog } from './DeleteAllergenDialog';
import { useCollection, useFirebase } from '@/firebase';
import { useMemo } from 'react';


export function AllergensTable() {
  const { firestore } = useFirebase();
  const allergensQuery = useMemo(() => firestore ? query(collection(firestore, 'allergens'), orderBy('name', 'asc')) : null, [firestore]);
  const { data: allergens, isLoading: loading } = useCollection<Allergen>(allergensQuery);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Allergen Name</TableHead>
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
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              {!loading &&
                allergens?.map((allergen) => (
                  <TableRow key={allergen.id}>
                    <TableCell className="font-medium">
                      {allergen.name}
                    </TableCell>
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
                          <DeleteAllergenDialog
                            allergenId={allergen.id}
                            allergenName={allergen.name}
                          >
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive-foreground focus:text-destructive-foreground focus:bg-destructive/90"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DeleteAllergenDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {!loading && allergens?.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No allergens found. Add your first one!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
