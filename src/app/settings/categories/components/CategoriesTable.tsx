
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
import type { IngredientCategory } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';
import { useCollection, useFirebase } from '@/firebase';
import { useMemo } from 'react';


export function CategoriesTable() {
  const { firestore } = useFirebase();
  const categoriesQuery = useMemo(() => firestore ? query(collection(firestore, 'ingredientCategories'), orderBy('name', 'asc')) : null, [firestore]);
  const { data: categoriesData, isLoading: loading } = useCollection<IngredientCategory>(categoriesQuery);

  const categories = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData.filter(c => c.name !== 'Sub-recipe');
  }, [categoriesData]);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
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
                categories?.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
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
                          <DeleteCategoryDialog
                            categoryId={category.id}
                            categoryName={category.name}
                          >
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive-foreground focus:text-destructive-foreground focus:bg-destructive/90"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DeleteCategoryDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {!loading && categories?.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No categories found. Add your first one!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
