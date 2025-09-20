
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
import { RecipesTable } from './components/RecipesTable';
import type { Recipe } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


export default function RecipesPage() {
  const router = useRouter();

  const handleEdit = (recipe: Recipe) => {
    router.push(`/recipes/${recipe.id}/edit`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Recipes">
         <Button asChild>
          <Link href="/recipes/new">
            <PlusCircle className="mr-2" />
            Add New Recipe
          </Link>
        </Button>
      </PageHeader>

      <Tabs defaultValue="recipes">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
          <TabsTrigger value="fabrication">Fabrication</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
