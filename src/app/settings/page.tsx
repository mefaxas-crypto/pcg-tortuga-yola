
'use client';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, Shapes, UtensilsCrossed, Store, Palette } from 'lucide-react';
import Link from 'next/link';
import { ThemeSwitcher } from './components/ThemeSwitcher';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store />
              Outlet Management
            </CardTitle>
            <CardDescription>
              Define and manage your kitchen locations, like &quot;Tortuga Bay&quot; or &quot;La Yola&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/settings/outlets">Manage Outlets</Link>
            </Button>
          </CardContent>
        </Card>
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
                <UtensilsCrossed />
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
                <Palette />
                General Settings
            </CardTitle>
            <CardDescription>
              Manage application appearance and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <ThemeSwitcher />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
