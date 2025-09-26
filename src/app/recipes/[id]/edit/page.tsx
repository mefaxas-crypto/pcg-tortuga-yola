
'use client';

import PageHeader from '@/components/PageHeader';
import { RecipeForm } from '../../components/RecipeForm';
import { Card, CardContent } from '@/components/ui/card';
import type { Recipe } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc, useFirebase } from '@/firebase';
import { useMemo } from 'react';

export default function EditRecipePage({ params }: { params: { id: string } }) {
  const { firestore } = useFirebase();
  const { id } = params;
  const docRef = useMemo(() => firestore ? doc(firestore, 'recipes', id) : null, [firestore, id]);
  const { data: recipe, isLoading: loading } = useDoc<Recipe>(docRef);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={loading ? 'Loading...' : `Edit Recipe: ${recipe?.name}`}
      />
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ) : recipe ? (
            <RecipeForm mode="edit" recipe={recipe} />
          ) : (
            <div className="text-center text-muted-foreground py-12">
              Recipe not found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
