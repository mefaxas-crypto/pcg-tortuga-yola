
'use client';

import PageHeader from '@/components/PageHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecipesTable } from './components/RecipesTable';
import type { Recipe } from '@/lib/types';
import { useRouter, Link } from 'next-intl';
import { ProductionForm } from './components/ProductionForm';
import { ButcheringForm } from './components/ButcheringForm';
import { ProductionLogHistory } from './components/ProductionLogHistory';
import { ButcheringLogHistory } from './components/ButcheringLogHistory';
import { useAuth } from '@/context/AuthContext';


export default function RecipesPage() {
  const router = useRouter();
  const { appUser } = useAuth();
  
  const canManageRecipes = appUser && ['Admin', 'Manager', 'Chef'].includes(appUser.role);
  const canPerformProduction = appUser && ['Admin', 'Manager', 'Chef', 'Cook'].includes(appUser.role);

  const handleEdit = (recipe: Recipe) => {
    router.push(`/recipes/${recipe.id}/edit`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Recipes & Production">
        {canManageRecipes && (
            <Button asChild>
                <Link href="/recipes/new">
                    <PlusCircle className="mr-2" />
                    Add New Recipe
                </Link>
            </Button>
        )}
      </PageHeader>

      <Tabs defaultValue="recipes">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
          <TabsTrigger value="production">Sub-recipe Production</TabsTrigger>
          <TabsTrigger value="butchering">Butchering Log</TabsTrigger>
        </TabsList>
        <TabsContent value="recipes">
            <RecipesTable onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="production" className="space-y-6">
            <Card>
                <CardHeader>
                <CardTitle>Log Sub-recipe Production</CardTitle>
                <CardDescription>
                  Record the production of a sub-recipe. This will deplete the required raw ingredients from your inventory and increase the stock of the finished sub-recipe.
                </CardDescription>
                </CardHeader>
                <CardContent>
                  {canPerformProduction ? (
                    <ProductionForm />
                  ) : (
                    <div className="text-center text-muted-foreground p-8 border border-dashed rounded-md">
                      You do not have permission to log sub-recipe production.
                    </div>
                  )}
                </CardContent>
            </Card>
            <ProductionLogHistory />
        </TabsContent>
         <TabsContent value="butchering" className="space-y-6">
            <Card>
                <CardHeader>
                <CardTitle>Log Butchering Yield</CardTitle>
                <CardDescription>
                  Record the breakdown of a primary cut into yielded items. This will deplete the primary item and add the new items to your inventory.
                </CardDescription>
                </CardHeader>
                <CardContent>
                  {canPerformProduction ? (
                    <ButcheringForm />
                  ) : (
                     <div className="text-center text-muted-foreground p-8 border border-dashed rounded-md">
                      You do not have permission to log butchering.
                    </div>
                  )}
                </CardContent>
            </Card>
            <ButcheringLogHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
