import PageHeader from '@/components/PageHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RecipeSuggestions } from './components/RecipeSuggestions';

export default function RecipesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Recipes & Menus" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
        </div>
        <div className="lg:col-span-1">
          <RecipeSuggestions />
        </div>
      </div>
    </div>
  );
}
