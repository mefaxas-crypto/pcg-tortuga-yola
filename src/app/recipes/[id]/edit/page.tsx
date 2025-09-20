'use client';

import PageHeader from '@/components/PageHeader';
import { RecipeForm } from '../../components/RecipeForm';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState }
from 'react';
import type { Recipe } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditRecipePage({ params }: { params: { id: string } }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecipe(id: string) {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'recipes', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setRecipe({ id: docSnap.id, ...docSnap.data() } as Recipe);
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error('Error fetching recipe:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecipe(params.id);
  }, [params.id]);


  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={loading ? 'Loading...' : `Edit Recipe: ${recipe?.name}`} />
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
