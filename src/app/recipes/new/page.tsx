'use client';

import PageHeader from '@/components/PageHeader';
import { RecipeForm } from '../components/RecipeForm';
import { Card, CardContent } from '@/components/ui/card';

export default function NewRecipePage() {

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add New Recipe" />
      <Card>
        <CardContent className="pt-6">
          <RecipeForm mode="add" />
        </CardContent>
      </Card>
    </div>
  );
}

    