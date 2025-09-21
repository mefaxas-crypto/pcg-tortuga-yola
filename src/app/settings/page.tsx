
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, Settings, Shapes, Knife } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List />
              Allergen Management
            </CardTitle>
            <CardDescription>
              Define and manage the list of allergens used in your ingredients and recipes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/settings/allergens">Manage Allergens</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Shapes />
                Category Management
                </CardTitle>
                <CardDescription>
                Manage the categories for your inventory items.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                <Link href="/settings/categories">Manage Categories</Link>
                </Button>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Knife />
                Butchering Templates
                </CardTitle>
                <CardDescription>
                Create and manage templates for butchering primary cuts into yields.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                <Link href="/settings/butchering-templates">Manage Templates</Link>
                </Button>
            </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Settings />
                General Settings
            </CardTitle>
            <CardDescription>
              Manage your outlets and other application preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[88px]">
                <div className="flex flex-col items-center gap-1 text-center">
                    <p className="text-sm text-muted-foreground">
                        Coming soon
                    </p>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
