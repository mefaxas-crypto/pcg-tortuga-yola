
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
import type { Recipe } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteRecipeDialog } from './DeleteRecipeDialog';
import { useCollection, useFirebase } from '@/firebase';
import { useMemo } from 'react';

type RecipesTableProps = {
  onEdit: (recipe: Recipe) => void;
};

export function RecipesTable({ onEdit }: RecipesTableProps) {
  const { firestore } = useFirebase();
  const recipesQuery = useMemo(() => firestore ? query(collection(firestore, 'recipes'), orderBy('name', 'asc')) : null, [firestore]);
  const { data: recipes, isLoading: loading } = useCollection<Recipe>(recipesQuery);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipe</TableHead>
                <TableHead className='hidden md:table-cell'>Category</TableHead>
                <TableHead className='hidden sm:table-cell'>Ingredients</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                     <TableCell className='hidden md:table-cell'>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell className='hidden sm:table-cell'>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              {!loading &&
                recipes?.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell>
                      <div className="font-medium">{recipe.name}</div>
                      <div className="text-xs text-muted-foreground md:hidden">{recipe.category}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{recipe.category}</TableCell>
                    <TableCell className='hidden sm:table-cell'>{recipe.ingredients.length}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(recipe.totalCost || 0)}
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
                          <DropdownMenuItem onClick={() => onEdit(recipe)}>
                            <FilePenLine className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DeleteRecipeDialog
                            recipeId={recipe.id}
                            recipeName={recipe.name}
                          >
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DeleteRecipeDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {!loading && recipes?.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No recipes found. Add your first one!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
