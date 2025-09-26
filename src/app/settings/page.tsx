
'use client';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, Shapes, UtensilsCrossed, Store, Users } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { appUser } = useAuth();
  
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {appUser?.role === 'Admin' && (
           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Users />
                User Management
                </CardTitle>
                <CardDescription>
                Manage users, roles, and approval workflows.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                <Link href="/settings/users">Manage Users</Link>
                </Button>
            </CardContent>
        </Card>
        )}
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
      </div>
    </div>
  );
}
