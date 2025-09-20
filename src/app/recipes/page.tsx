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
import { Flame, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { RecipeFormSheet } from './components/RecipeFormSheet';
import { RecipesTable } from './components/RecipesTable';
import type { Recipe } from '@/lib/types';

export default function RecipesPage() {
  const [sheetState, setSheetState] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    recipe?: Recipe;
  }>({
    open: false,
    mode: 'add',
  });

  const handleAdd = () => {
    setSheetState({ open: true, mode: 'add' });
  };

  const handleEdit = (recipe: Recipe) => {
    setSheetState({ open: true, mode: 'edit', recipe });
  };

  const handleClose = () => {
    setSheetState({ open: false, mode: sheetState.mode });
  };


  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Recipes & Menus">
         <Button onClick={handleAdd}>
          <PlusCircle className="mr-2" />
          Add New Recipe
        </Button>
      </PageHeader>

      <Tabs defaultValue="recipes">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
          <TabsTrigger value="fabrication">Fabrication</TabsTrigger>
          <TabsTrigger value="menus">Menus</TabsTrigger>
        </TabsList>
        <TabsContent value="recipes">
            <RecipesTable onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="fabrication">
            <Card>
                <CardHeader>
                <CardTitle>Fabrication & Yield Management</CardTitle>
                <CardDescription>Define specs for butchering and fabrication to calculate true cost and inventory.</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[300px]">
                    <div className="flex flex-col items-center gap-1 text-center">
                    <Flame className="h-12 w-12 text-muted-foreground" />
                    <h3 className="text-2xl mt-4 font-bold tracking-tight">
                        Fabrication Specs Coming Soon
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Define specs for butchering and fabrication to calculate true cost and inventory.
                    </p>
                    </div>
                </div>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="menus">
          <Card>
            <CardHeader>
              <CardTitle>Menus</CardTitle>
              <CardDescription>
                Assemble menus and analyze overall profitability.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[300px]">
                <div className="flex flex-col items-center gap-1 text-center">
                  <h3 className="text-2xl font-bold tracking-tight">
                    Menu Engineering Coming Soon
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You'll be able to create and analyze your menus here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

       <RecipeFormSheet
        open={sheetState.open}
        mode={sheetState.mode}
        recipe={sheetState.recipe}
        onClose={handleClose}
      />
    </div>
  );
}
