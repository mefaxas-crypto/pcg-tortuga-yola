
'use client';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, Shapes, UtensilsCrossed, Store, Users } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { appUser } = useAuth();
  
  const settingCards = [
    { 
      role: ['Admin'], 
      href: '/settings/users', 
      icon: Users, 
      title: 'User Management', 
      description: 'Manage users, roles, and approval workflows.' 
    },
    { 
      role: ['Admin', 'Manager'], 
      href: '/settings/outlets', 
      icon: Store, 
      title: 'Outlet Management', 
      description: 'Define and manage your kitchen locations.'
    },
    { 
      role: ['Admin', 'Manager', 'Chef'], 
      href: '/settings/allergens', 
      icon: List, 
      title: 'Allergen Management', 
      description: 'Manage the list of allergens used in recipes.'
    },
    { 
      role: ['Admin', 'Manager', 'Chef'], 
      href: '/settings/categories', 
      icon: Shapes, 
      title: 'Category Management', 
      description: 'Manage the categories for your inventory items.' 
    },
     { 
      role: ['Admin', 'Manager', 'Chef'], 
      href: '/settings/butchering-templates', 
      icon: UtensilsCrossed, 
      title: 'Butchering Templates', 
      description: 'Create templates for butchering primary cuts.' 
    },
  ];

  const accessibleCards = settingCards.filter(card => appUser && card.role.includes(appUser.role));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accessibleCards.map((card) => (
          <Card key={card.href}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <card.icon />
                {card.title}
              </CardTitle>
              <CardDescription>
                {card.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={card.href}>Manage {card.title.split(' ')[0]}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
