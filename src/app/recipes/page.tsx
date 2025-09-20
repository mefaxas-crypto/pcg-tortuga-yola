import PageHeader from '@/components/PageHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flame } from 'lucide-react';

export default function RecipesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Recipes & Menus" />
      <Tabs defaultValue="recipes">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
          <TabsTrigger value="fabrication">Fabrication</TabsTrigger>
          <TabsTrigger value="menus">Menus</TabsTrigger>
        </TabsList>
        <TabsContent value="recipes">
          <Card>
            <CardHeader>
              <CardTitle>My Recipes</CardTitle>
              <CardDescription>
                Browse and manage your collection of recipes and sub-recipes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[300px]">
                <div className="flex flex-col items-center gap-1 text-center">
                  <h3 className="text-2xl font-bold tracking-tight">
                    Recipe Management Coming Soon
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You'll be able to create, edit, and cost your recipes here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}
